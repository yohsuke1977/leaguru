/**
 * 停止から30日たったリーグのデータを消す段取り（api/cleanup.ts から使う・leaguru#7）。
 *
 * 以前は全部の表を `.eq('league_id', id)` で消していたが、league-saas の表の半分には
 * league_id 列が無い（players・game_batting・division_teams など11表。2026-11-13 実DBで確認）。
 * PostgREST は存在しない列で 400 を返すので、そこは毎回何も消えず、最後の leagues の削除も
 * 参照の制約で失敗していた。しかも結果を見ていなかったので「削除済み」と数えていた。
 *
 * ここでは親の id をたどって子を消す（子 → 親の順）。どれか1つでも失敗したら、その場で止めて
 * 失敗した表とエラーを返す（途中まで消えた状態は翌日の実行で続きから消える）。
 *
 * ⚠️ league-saas に表を足したら、ここにも足すこと（足さないと参照の制約で leagues が消せずに止まり、
 *    運営にメールが届く＝気づける作りにはしてある）。
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type DeletionStep = { table: string; column: string; ids: (number | string)[] }
export type DeletionResult =
  | { ok: true; deleted: Record<string, number> }
  | { ok: false; deleted: Record<string, number>; failedTable: string; error: string }

const CHUNK = 200

async function idsOf(db: SupabaseClient, table: string, column: string, values: (number | string)[]): Promise<number[]> {
  const out: number[] = []
  for (let i = 0; i < values.length; i += CHUNK) {
    const { data, error } = await db.from(table).select('id').in(column, values.slice(i, i + CHUNK))
    if (error) throw new Error(`${table} の読み取りに失敗: ${error.message}`)
    out.push(...(data ?? []).map(r => (r as { id: number }).id))
  }
  return out
}

/** 消す順番（子 → 親）と、それぞれ何で絞るかを組み立てる。読むだけで何も消さない */
export async function planLeagueDeletion(db: SupabaseClient, leagueId: number): Promise<DeletionStep[]> {
  const L = [leagueId]
  const teams = await idsOf(db, 'teams', 'league_id', L)
  const games = await idsOf(db, 'games', 'league_id', L)
  const tournaments = await idsOf(db, 'tournaments', 'league_id', L)
  const groups = tournaments.length ? await idsOf(db, 'tournament_groups', 'tournament_id', tournaments) : []
  const tGames = tournaments.length ? await idsOf(db, 'tournament_games', 'tournament_id', tournaments) : []
  const divisions = await idsOf(db, 'divisions', 'league_id', L)

  return [
    // 大会
    { table: 'tournament_game_pitching', column: 'tournament_game_id', ids: tGames },
    { table: 'tournament_game_batting', column: 'tournament_game_id', ids: tGames },
    { table: 'tournament_games', column: 'tournament_id', ids: tournaments },
    { table: 'tournament_group_teams', column: 'group_id', ids: groups },
    { table: 'tournament_groups', column: 'tournament_id', ids: tournaments },
    { table: 'tournaments', column: 'league_id', ids: L },
    // リーグ戦
    { table: 'game_pitching', column: 'game_id', ids: games },
    { table: 'game_batting', column: 'game_id', ids: games },
    { table: 'games', column: 'league_id', ids: L },
    { table: 'schedules', column: 'league_id', ids: L },
    { table: 'division_teams', column: 'division_id', ids: divisions },
    { table: 'divisions', column: 'league_id', ids: L },
    { table: 'seasons', column: 'league_id', ids: L },
    // チーム（選手名・招待・写真などの個人情報を含む）
    { table: 'players', column: 'team_id', ids: teams },
    { table: 'team_invitations', column: 'team_id', ids: teams },
    { table: 'team_admins', column: 'team_id', ids: teams },
    { table: 'team_photos', column: 'team_id', ids: teams },
    { table: 'team_integrations', column: 'league_id', ids: L },
    { table: 'teams', column: 'league_id', ids: L },
    // リーグの設定・お知らせ・問い合わせ
    { table: 'posts', column: 'league_id', ids: L },
    { table: 'contact_messages', column: 'league_id', ids: L },
    { table: 'site_settings', column: 'league_id', ids: L },
    { table: 'domains', column: 'league_id', ids: L },
    { table: 'scorebook_usage', column: 'league_id', ids: L },
    { table: 'league_admins', column: 'league_id', ids: L },
    { table: 'leagues', column: 'id', ids: L },
  ].filter(s => s.ids.length > 0) as DeletionStep[]
}

/** 組み立てた順に消す。失敗したらその場で止める */
export async function executeLeagueDeletion(db: SupabaseClient, steps: DeletionStep[]): Promise<DeletionResult> {
  const deleted: Record<string, number> = {}
  for (const step of steps) {
    for (let i = 0; i < step.ids.length; i += CHUNK) {
      const { error, count } = await db.from(step.table)
        .delete({ count: 'exact' })
        .in(step.column, step.ids.slice(i, i + CHUNK))
      if (error) return { ok: false, deleted, failedTable: step.table, error: `${error.code ?? ''} ${error.message}`.trim() }
      deleted[step.table] = (deleted[step.table] ?? 0) + (count ?? 0)
    }
  }
  return { ok: true, deleted }
}

/** 数えるだけ（消さない）。確認用 */
export async function countLeagueRows(db: SupabaseClient, steps: DeletionStep[]): Promise<Record<string, number | string>> {
  const out: Record<string, number | string> = {}
  for (const step of steps) {
    let n = 0
    for (let i = 0; i < step.ids.length; i += CHUNK) {
      const { error, count } = await db.from(step.table).select('*', { count: 'exact', head: true }).in(step.column, step.ids.slice(i, i + CHUNK))
      if (error) { out[step.table] = `エラー: ${error.message}`; break }
      n += count ?? 0
    }
    if (!(step.table in out)) out[step.table] = n
  }
  return out
}
