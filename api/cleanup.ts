import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { executeLeagueDeletion, planLeagueDeletion } from '../src/lib/leagueDeletion.js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY!)

/**
 * Vercel Cron（毎日 UTC 2:00）。停止から30日たったリーグのデータを消す。
 * 停止のお知らせで「30日を過ぎると、すべてのデータが完全に削除されます」と約束している。
 *
 * 消し方は src/lib/leagueDeletion.ts（leaguru#7）。1つでも失敗したらそのリーグは「削除済み」に数えず、
 * 消した日・失敗した日は support@ に結果をメールする（以前は結果を見ずに全件「削除済み」と記録していた）。
 *
 * ⚠️ ログインのアカウント（Supabase の auth ユーザー）は消さない（league_admins の紐付けだけ消える）。
 *    取り消せない操作なので、消すかどうかは運営が判断する（メールに管理者の数を載せる）。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  // Verify this is an internal cron call
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, name, slug, suspended_at')
    .eq('status', 'suspended')
    .lt('suspended_at', cutoff)

  if (error) {
    console.error('Cleanup query error:', error)
    await notify('【要対応】30日後の自動削除が動けませんでした', [`停止中のリーグを探す段階で失敗しました。`, ``, `エラー: ${error.message}`])
    return res.status(500).json({ error: 'Query failed' })
  }

  if (!leagues || leagues.length === 0) {
    return res.json({ deleted: 0 })
  }

  const done: string[] = []
  const failed: string[] = []

  for (const league of leagues) {
    // 管理者のログインアカウント（消さずに残る）の数を、消す前に控える
    const { count: admins } = await supabase.from('league_admins').select('user_id', { count: 'exact', head: true }).eq('league_id', league.id)
    try {
      const steps = await planLeagueDeletion(supabase, league.id)
      const result = await executeLeagueDeletion(supabase, steps)
      const counts = Object.entries(result.deleted).filter(([, n]) => n > 0).map(([t, n]) => `${t} ${n}`).join('・') || 'なし'
      if (result.ok) {
        console.log(`Deleted league: ${league.name} (${league.slug})`, result.deleted)
        done.push(`・${league.name}（${league.slug}・停止 ${league.suspended_at?.slice(0, 10)}）: ${counts}／ログインアカウント ${admins ?? 0}件は残しています`)
      } else {
        console.error(`League deletion failed: ${league.slug} at ${result.failedTable}`, result.error)
        failed.push(`・${league.name}（${league.slug}）: 「${result.failedTable}」で失敗 — ${result.error}\n  ここまでに消したもの: ${counts}`)
      }
    } catch (e) {
      console.error(`League deletion failed: ${league.slug}`, e)
      failed.push(`・${league.name}（${league.slug}）: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  await notify(
    failed.length ? `【要対応】30日後の自動削除で失敗 ${failed.length}件（成功 ${done.length}件）` : `30日後の自動削除: ${done.length}件を削除しました`,
    [
      ...(failed.length ? ['■ 失敗（明日また続きから試します。同じ所で止まり続けるなら、表の追加漏れの可能性があります）', ...failed, ''] : []),
      ...(done.length ? ['■ 削除したリーグ', ...done] : []),
    ],
  )

  return res.status(failed.length ? 500 : 200).json({ deleted: done.length, failed: failed.length })
}

async function notify(subject: string, lines: string[]) {
  await resend.emails.send({
    from: 'noreply@leaguru.jp',
    to: 'support@leaguru.jp',
    subject,
    text: lines.join('\n'),
  }).catch(err => console.error('Cleanup notify error:', err))
}
