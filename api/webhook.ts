import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { isPlanKey, PLAN_BY_KEY, planForTeamCount } from '../src/lib/plans.js'

// apiVersion を明示pin。SDK更新で既定APIが変わると型エラーになり、変更に必ず気づける
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export const config = { api: { bodyParser: false } }

// データベースの読み書きの失敗（Supabase の一時的な不調など）。
// これが出たら 500 を返して Stripe にやり直してもらう（leaguru#10）。
// 「見つからなかった」と「読めなかった」を取り違えないために、エラーは必ずここへ通す
class DbError extends Error {}
function check(error: { message: string; code?: string } | null, what: string) {
  if (error) throw new DbError(`${what}: ${error.code ?? ''} ${error.message}`)
}

// 申込で新しく作ったアカウントの目印。やり直し（同じ申込の再入）のときだけ
// 仮パスワードを作り直してよい。それ以外の既存アカウントのパスワードは変えない（leaguru#9）
const CHECKOUT_MARK = 'leaguru_checkout_session'

// 既存アカウントの照合用。supabase-js の admin API には
// メールでの検索が無いのでページングして探す（登録ユーザー数は少ない想定）
async function findUserByEmail(email: string) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    check(error, 'ユーザー一覧の取得')
    if (!data?.users?.length) return null
    const hit = data.users.find(u => u.email?.toLowerCase() === target)
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

// 更新時の帯判定用。次のうち一番大きい数（league-saas#42）:
//  - 進行中（status='active'）のシーズン全体に登録された異なるチーム数（クラスごとにシーズンを分けても合計する）
//  - 直近のシーズン1つのチーム数（シーズンが空のまま＝次年度をまだ作っていないときも、直前の実績で判定する）
//  - 過去1年に試合をしたチーム数（試合日で数える。シーズンを「終了」にしてから足す抜け道を拾う）
//  - 直近のトーナメント1つのチーム数
// teams テーブルの行数は使わない（解散チームが残り続けるため）。
// ⚠️ 読み取りの失敗は投げる。0チーム扱いにすると、DB の不調で一番安い帯へ勝手に下げてしまう
export async function countRecentTeams(leagueId: number): Promise<number> {
  let best = 0
  {
    const { data: active, error } = await supabase.from('seasons').select('id').eq('league_id', leagueId).eq('status', 'active')
    check(error, '進行中シーズンの取得')
    const ids = (active ?? []).map(s => s.id)
    if (ids.length) {
      const { data: divs, error: e2 } = await supabase.from('divisions').select('id').in('season_id', ids)
      check(e2, '進行中シーズンの部門の取得')
      const divIds = (divs ?? []).map(d => d.id)
      if (divIds.length) {
        const { data: dt, error: e3 } = await supabase.from('division_teams').select('team_id').in('division_id', divIds)
        check(e3, '進行中シーズンのチームの取得')
        best = Math.max(best, new Set((dt ?? []).map(r => r.team_id)).size)
      }
    }
  }
  {
    // 試合日は日程（schedules.game_date）にある。games.created_at は過去データの取り込みで今年の日付になっていることがあるので使わない
    const since = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10)
    const played = new Set<number>()
    for (let from = 0; ; from += 1000) {
      const { data: gs, error } = await supabase.from('games')
        .select('team1_id, team2_id, schedules!inner(game_date)')
        .eq('league_id', leagueId).gte('schedules.game_date', since)
        .order('id').range(from, from + 999)
      check(error, '過去1年の試合の取得')
      for (const g of gs ?? []) { if (g.team1_id) played.add(g.team1_id); if (g.team2_id) played.add(g.team2_id) }
      if (!gs || gs.length < 1000) break
    }
    best = Math.max(best, played.size)
  }
  const { data: seasons, error: e1 } = await supabase.from('seasons').select('id').eq('league_id', leagueId).order('id', { ascending: false }).limit(5)
  check(e1, 'シーズンの取得')
  for (const s of seasons ?? []) {
    const { data: divs, error: e2 } = await supabase.from('divisions').select('id').eq('season_id', s.id)
    check(e2, '部門の取得')
    const divIds = (divs ?? []).map(d => d.id)
    if (!divIds.length) continue
    const { data: dt, error: e3 } = await supabase.from('division_teams').select('team_id').in('division_id', divIds)
    check(e3, '部門のチームの取得')
    const n = new Set((dt ?? []).map(r => r.team_id)).size
    if (n > 0) { best = Math.max(best, n); break }
  }
  const { data: tours, error: e4 } = await supabase.from('tournaments').select('id').eq('league_id', leagueId).order('id', { ascending: false }).limit(5)
  check(e4, 'トーナメントの取得')
  for (const t of tours ?? []) {
    // グループ戦の参加チーム＋決勝（勝ち抜き）の枠のチーム。予選なしの勝ち抜き大会はグループが無い
    const ids = new Set<number>()
    const { data: groups, error: e5 } = await supabase.from('tournament_groups').select('id').eq('tournament_id', t.id)
    check(e5, 'グループの取得')
    const gIds = (groups ?? []).map(g => g.id)
    if (gIds.length) {
      const { data: gt, error: e6 } = await supabase.from('tournament_group_teams').select('team_id').in('group_id', gIds)
      check(e6, 'グループのチームの取得')
      for (const r of gt ?? []) ids.add(r.team_id)
    }
    const { data: tg, error: e7 } = await supabase.from('tournament_games').select('team1_id, team2_id').eq('tournament_id', t.id).eq('stage', 'bracket')
    check(e7, '決勝の枠の取得')
    for (const r of tg ?? []) { if (r.team1_id) ids.add(r.team1_id); if (r.team2_id) ids.add(r.team2_id) }
    if (ids.size > 0) { best = Math.max(best, ids.size); break }
  }
  return best
}

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function toSlug(name: string): string {
  // 日本語リーグ名からアルファベットスラグを生成できないので乱数で生成
  return 'league-' + Math.random().toString(36).slice(2, 8)
}

// Stripe API 2025-03-31.basil 以降、current_period_end は Subscription 直下から
// サブスクリプションアイテム側（items.data[].current_period_end）へ移動した
function subPeriodEndISO(sub: Stripe.Subscription): string | null {
  const end = sub.items?.data?.[0]?.current_period_end
  return typeof end === 'number' ? new Date(end * 1000).toISOString() : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return res.status(400).json({ error: 'Invalid signature' })
  }

  // DB の読み書きが失敗したら（DbError ほか想定外の例外も）500 を返して Stripe にやり直してもらう。
  // 以前は失敗を見ずに 200 を返していたため、やり直しも運営への連絡も起きなかった（leaguru#10）
  try {
    return await route(event, res)
  } catch (err) {
    console.error(`webhook ${event.type} ${event.id} が失敗（Stripe がやり直す）:`, err)
    if (!res.headersSent) return res.status(500).json({ error: 'Temporary failure' })
  }
}

async function route(event: Stripe.Event, res: VercelResponse) {
  // ── invoice.payment_failed ──────────────────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    if (customerId) {
      const { data: league, error: lErr } = await supabase
        .from('leagues')
        .select('id, name, slug')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
      check(lErr, 'リーグの取得')
      if (league) {
        const { data: settings, error: sErr } = await supabase
          .from('site_settings')
          .select('value')
          .eq('league_id', league.id)
          .eq('key', 'contact_email')
          .maybeSingle()
        check(sErr, '連絡先メールの取得')
        const adminEmail = (settings as { value: string } | null)?.value
        if (adminEmail) {
          await resend.emails.send({
            from: 'noreply@leaguru.jp',
            to: adminEmail,
            subject: `【Leaguru】お支払いに失敗しました — ${league.name}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
                <h2 style="color:#c0392b">お支払いに失敗しました</h2>
                <p><strong>${league.name}</strong> の定期支払いが処理できませんでした。</p>
                <p>クレジットカード情報をご確認のうえ、お早めにお支払い方法を更新してください。</p>
                <p>支払いが完了しない場合、サービスが停止される場合があります。</p>
                <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
                <p style="color:#aaa;font-size:12px">Leaguru サポート: support@leaguru.jp</p>
              </div>
            `,
          }).catch(err => console.error('Payment failed email error:', err))
        }
      }
    }
    return res.json({ received: true })
  }

  // ── customer.subscription.updated ────────────────────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    if (customerId) {
      // 通知の中身ではなく、いまの契約を Stripe に聞いてから書く。
      // 失敗→やり直しの間に新しい通知が先に処理されていても、古い内容で上書きしない
      const latest = await stripe.subscriptions.retrieve(sub.id)
      const { error } = await supabase.from('leagues').update({
        stripe_subscription_id: latest.id,
        current_period_end: subPeriodEndISO(latest),
        cancel_at_period_end: latest.cancel_at_period_end,
      }).eq('stripe_customer_id', customerId)
      check(error, '契約期間の更新')
    }
    return res.json({ received: true })
  }

  // ── customer.subscription.deleted ────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
    if (customerId) {
      const { data: league, error: lErr } = await supabase
        .from('leagues')
        .select('id, name, slug, status')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
      check(lErr, 'リーグの取得')
      if (league) {
        // やり直しで来たときに停止日（＝30日後の削除の起点）を後ろへずらさない
        if (league.status !== 'suspended') {
          const { error: upErr } = await supabase
            .from('leagues')
            .update({ status: 'suspended', suspended_at: new Date().toISOString() })
            .eq('id', league.id)
          if (upErr) {
            // 停止を記録できないと、リーグは無料で動き続け、30日後の削除の対象にもならない。
            // お客さんへの「停止しました」は送らずに 500 を返す（Stripe がやり直す）。
            // やり直しても直らないときのために、運営にも毎回知らせる
            await resend.emails.send({
              from: 'noreply@leaguru.jp',
              to: 'support@leaguru.jp',
              subject: `【要対応】サービス停止の記録に失敗 — ${league.name}`,
              text: [
                `Stripe の契約は終了しましたが、リーグを停止状態にできませんでした。`,
                `Stripe が時間をおいてやり直します。数日続く場合は、Supabase で leagues を手で直してください:`,
                `  status='suspended', suspended_at=<今の日時>（id=${league.id}）`,
                `お客さんへの停止のお知らせは、まだ送っていません。`,
                ``,
                `リーグ: ${league.name}`,
                `スラグ: ${league.slug}`,
                `エラー: ${upErr.code ?? ''} ${upErr.message}`,
              ].join('\n'),
            }).catch(err => console.error('Suspension failure notify error:', err))
            throw new DbError(`停止の記録: ${upErr.code ?? ''} ${upErr.message}`)
          }
        }

        const { data: settings, error: sErr } = await supabase
          .from('site_settings')
          .select('value')
          .eq('league_id', league.id)
          .eq('key', 'contact_email')
          .maybeSingle()
        check(sErr, '連絡先メールの取得')
        const adminEmail = (settings as { value: string } | null)?.value
        if (adminEmail) {
          await resend.emails.send({
            from: 'noreply@leaguru.jp',
            to: adminEmail,
            subject: `【Leaguru】サービスが停止されました — ${league.name}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
                <h2 style="color:#c0392b">サービスが停止されました</h2>
                <p><strong>${league.name}</strong> のサービスが停止されました。</p>
                <p>現在のデータは<strong>30日間</strong>保持されます。再開をご希望の場合は、この期間内に <a href="mailto:support@leaguru.jp">support@leaguru.jp</a> までご連絡ください。データを引き継いで再開します。</p>
                <p style="color:#666;font-size:13px">※ 申込フォームから新しくお申し込みいただくと、データの入っていない別のリーグになります。</p>
                <p>30日を過ぎると、すべてのデータが完全に削除されます。</p>
                <p>ご不明な点はサポートまでお問い合わせください。</p>
                <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
                <p style="color:#aaa;font-size:12px">Leaguru サポート: support@leaguru.jp</p>
              </div>
            `,
          }).catch(err => console.error('Suspension email error:', err))
        }

        await resend.emails.send({
          from: 'noreply@leaguru.jp',
          to: 'support@leaguru.jp',
          subject: `【leaguru サービス停止】${league.name}`,
          text: `サービスが停止されました。\n\nリーグ: ${league.name}\nスラグ: ${league.slug}\n30日後にデータ削除予定。`,
        }).catch(err => console.error('Admin suspension notify error:', err))
      }
    }
    return res.json({ received: true })
  }

  // ── invoice.upcoming: 更新の数日前に届く。実チーム数で帯を見直してから更新させる ──
  // 途中でチームが減っても年内の料金は据え置き（規約）なので、下げるのはここだけ。
  // 上げる方向は通常ここに来ない（上限超過は管理画面でブロックしてアップグレードさせている）が、念のため両方向に対応する。
  if (event.type === 'invoice.upcoming') {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    if (customerId) {
      const { data: league, error: lErr } = await supabase
        .from('leagues')
        .select('id, name, plan, stripe_subscription_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
      check(lErr, 'リーグの取得')
      // 'standard'（旧一律契約）や 'free' は見直しの対象外
      if (league?.stripe_subscription_id && isPlanKey(league.plan)) {
        const teams = await countRecentTeams(league.id)
        const target = planForTeamCount(teams)
        if (target.key !== league.plan) {
          const priceId = process.env[target.envKey]
          if (!priceId) {
            console.error(`更新時の帯見直し: Stripe Price 未設定 ${target.envKey}（league ${league.id}）`)
          } else {
            const sub = await stripe.subscriptions.retrieve(league.stripe_subscription_id)
            const item = sub.items.data[0]
            if (item) {
              // 更新前なので日割りは発生させない。次の請求からそのまま新プランの金額になる
              await stripe.subscriptions.update(sub.id, {
                items: [{ id: item.id, price: priceId }],
                proration_behavior: 'none',
              })
              // 失敗したら 500 → やり直しで Stripe 側をもう一度同じ価格にし（変化なし）、ここを書き直す
              const { error: pErr } = await supabase.from('leagues').update({ plan: target.key }).eq('id', league.id)
              check(pErr, '料金帯の記録')
              console.log(`更新時の帯見直し: ${league.name} ${league.plan}→${target.key}（直近${teams}チーム）`)
            }
          }
        } else {
          console.log(`更新時の帯見直し: ${league.name} は ${league.plan} のまま（直近${teams}チーム）`)
        }
      }
    }
    return res.json({ received: true })
  }

  if (event.type !== 'checkout.session.completed') return res.json({ received: true })

  const session = event.data.object as Stripe.Checkout.Session
  const { leagueName, contact, phone, size, plan: planKey, slug: chosenSlug,
    referrer, landing_page, utm_source, utm_medium, utm_campaign } = session.metadata ?? {}
  const email = session.customer_email ?? ''

  // 流入元（checkout.ts が metadata に積んだもの）。LP非経由・全項目空なら null
  const attribution = (referrer || landing_page || utm_source || utm_medium || utm_campaign)
    ? {
        referrer: referrer || '', landing_page: landing_page || '',
        utm_source: utm_source || '', utm_medium: utm_medium || '', utm_campaign: utm_campaign || '',
      }
    : null

  if (!leagueName || !email) {
    // 同一Stripeアカウントを他プロダクト（NineCut・レジあと・推し通知）と共有しており、
    // Leaguru以外のcheckoutもここへ届く。自分宛でないイベントは200で受け流す。
    // 400を返すとStripeが数日リトライし続け、エラー率100%→エンドポイント自動無効化に至る。
    console.log('Leaguru以外のcheckoutのためスキップ:', session.id)
    return res.json({ received: true, skipped: true })
  }

  // ── 冪等化 ──────────────────────────────────────────────────────────────
  // Stripeは500を配信失敗とみなして数日リトライするが、失敗する前に書き込んだ行は
  // 残ったままになる。同じイベントが再入したときにリーグを作り直さないよう、
  // 既存の stripe_subscription_id を目印にして「新規 / 再開 / 完了済み」を判定する。
  // ⚠️ slug で照合してはいけない。他人が既存リーグのslugを指定して乗っ取れてしまう
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null

  // ⚠️ 読めなかったときに「無い」と扱うと、リーグの二重作成やウェルカムメールの二重送信になる
  let league: { id: number; slug: string } | null = null
  if (stripeSubscriptionId) {
    const { data: found, error: fErr } = await supabase
      .from('leagues')
      .select('id, slug')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .maybeSingle()
    check(fErr, '申込済みリーグの取得')
    league = found ?? null
  }

  if (league) {
    // 管理者まで作られていれば完全に完了済み。仮パスワードの再発行もメール再送もしない
    const { data: provisioned, error: pErr } = await supabase
      .from('league_admins')
      .select('user_id')
      .eq('league_id', league.id)
      .limit(1)
    check(pErr, '管理者の紐付けの取得')
    if (provisioned?.length) {
      console.log('処理済みの申し込みのためスキップ:', session.id, 'league_id=', league.id)
      return res.json({ received: true, duplicate: true })
    }
    console.log('途中で失敗した申し込みを再開:', session.id, 'league_id=', league.id)
  }

  // 1. リーグ作成（再開時は既存行を使い回す）
  if (!league) {
    let periodEnd: string | null = null
    if (stripeSubscriptionId) {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
      periodEnd = subPeriodEndISO(sub)
    }
    const { data: created, error: leagueErr } = await supabase
      .from('leagues')
      .insert({
        name: leagueName,
        slug: chosenSlug || toSlug(leagueName),
        // どの料金帯で契約したか。'standard' 固定だと売れた価格が残らない
        plan: isPlanKey(planKey) ? planKey : 'standard',
        status: 'active',
        stripe_customer_id: stripeCustomerId ?? null,
        stripe_subscription_id: stripeSubscriptionId ?? null,
        current_period_end: periodEnd,
        attribution,
      })
      .select('id, slug')
      .single()

    if (leagueErr || !created) {
      console.error('League insert error:', leagueErr)
      // 運営に知らせる（leaguru#6）。ここで止まると、お客さんは無料期間に入ったまま
      // ウェルカムメールも管理画面も届かず、こちらも気づけない
      const duplicate = leagueErr?.code === '23505' // slug の重複（leagues_slug_key）
      await resend.emails.send({
        from: 'noreply@leaguru.jp',
        to: 'support@leaguru.jp',
        subject: `【要対応】リーグ作成失敗 — ${leagueName}`,
        text: [
          `決済（無料期間の開始）は済んでいますが、リーグを作れませんでした。`,
          `お客さんには何も届いていません。手でリーグを作るか、ご本人に連絡してください。`,
          ``,
          `リーグ名: ${leagueName}`,
          `担当者: ${contact}`,
          `メール: ${email}`,
          `希望URL: ${chosenSlug || toSlug(leagueName)}`,
          `Stripe お客さんID: ${stripeCustomerId ?? '不明'}`,
          `Stripe サブスクリプションID: ${stripeSubscriptionId ?? '不明'}`,
          `エラー: ${leagueErr?.code ?? ''} ${leagueErr?.message ?? '不明'}`,
          duplicate ? `\n→ URL が他のリーグと重複しています（申込の取り合い）。別のURLで手作成してください。` : '',
        ].join('\n'),
      }).catch(err => console.error('League failure notify error:', err))
      // 重複は何度やり直しても同じ結果なので、Stripe のやり直しを止める（通知は上で済んだ）。
      // それ以外（DB の一時的な不調など）は 500 にしてやり直してもらう
      if (duplicate) return res.json({ received: true, leagueCreated: false })
      return res.status(500).json({ error: 'League creation failed' })
    }
    league = created
  }

  // 2. site_settings 初期化（再開時に二重登録しない）
  // contact_email が無いと、支払い失敗・停止のお知らせが黙って送られなくなる。
  // 失敗したら 500 → やり直しで、ここから続きを再開する（leaguru#10）
  const { data: existingSettings, error: esErr } = await supabase
    .from('site_settings')
    .select('key')
    .eq('league_id', league.id)
    .limit(1)
  check(esErr, 'サイト設定の取得')
  if (!existingSettings?.length) {
    const { error: insErr } = await supabase.from('site_settings').insert([
      { key: 'site_title', value: leagueName, league_id: league.id },
      { key: 'layout', value: 'standard', league_id: league.id },
      { key: 'team_admin_enabled', value: 'false', league_id: league.id },
      { key: 'contact_email', value: email, league_id: league.id },
    ])
    check(insErr, 'サイト設定の登録')
  }

  // 3. 仮パスワード生成
  const tmpPassword = Math.random().toString(36).slice(2, 8).toUpperCase() +
    Math.random().toString(36).slice(2, 8) + '!'

  // 4. 管理者アカウント
  // - 新しいメール → アカウントを作り、仮パスワードを送る。この申込で作った目印を付けておく
  // - この申込のやり直しで、前回このアカウントを作っていた → 仮パスワードだけ作り直す
  //   （前回の仮パスワードはメールで届いていないので）
  // - それ以外の既存アカウント（チーム管理者・別のリーグの管理者など）→ パスワードは変えず、
  //   新しいリーグにつなぐだけ。ウェルカムメールは「今のパスワードで」と案内する（leaguru#9）
  let adminUserId: string
  let passwordToSend: string | null = tmpPassword
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: tmpPassword,
    email_confirm: true,
    app_metadata: { [CHECKOUT_MARK]: session.id },
  })

  if (authUser?.user) {
    adminUserId = authUser.user.id
  } else {
    const existingUser = await findUserByEmail(email)
    if (!existingUser) {
      console.error('Auth user error:', authErr)
      return res.status(500).json({ error: 'User creation failed' })
    }
    adminUserId = existingUser.id
    if (existingUser.app_metadata?.[CHECKOUT_MARK] === session.id) {
      const { error: pwErr } = await supabase.auth.admin.updateUserById(existingUser.id, { password: tmpPassword })
      if (pwErr) {
        console.error('Auth password reset error:', pwErr)
        return res.status(500).json({ error: 'User creation failed' })
      }
    } else {
      passwordToSend = null
      console.log('既存アカウントを新しいリーグにつなぐ（パスワードは変えない）:', league.slug, adminUserId)
    }
  }

  // 5. league_admins に紐付け
  // 失敗すると、ログインできても管理画面が使えない。ウェルカムメールの前に 500 を返し、
  // やり直しで続きから再開する（leaguru#10）
  const { error: laErr } = await supabase.from('league_admins').insert({
    user_id: adminUserId,
    league_id: league.id,
  })
  check(laErr, '管理者の紐付け')

  // 6. Vercel にサブドメインを追加（SSL自動発行）
  // 失敗してもリーグ作成は止めない（後から手で追加できる）。その代わり結果を
  // 申し込み通知メールに載せ、つながらないサブドメインを見落とさないようにする。
  // 以前は fetch の例外だけを拾っていたため、トークン失効などの 4xx が無言で通っていた
  const subdomain = `${league.slug}.leaguru.jp`
  const vercelToken = process.env.VERCEL_TOKEN
  const vercelProjectId = process.env.VERCEL_LEAGUE_PROJECT_ID
  const vercelTeamId = process.env.VERCEL_TEAM_ID
  let domainStatus: string
  if (vercelToken && vercelProjectId) {
    const teamParam = vercelTeamId ? `?teamId=${vercelTeamId}` : ''
    try {
      const domainRes = await fetch(`https://api.vercel.com/v9/projects/${vercelProjectId}/domains${teamParam}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: subdomain }),
      })
      if (domainRes.ok) {
        domainStatus = '追加済み'
      } else {
        const body = await domainRes.json().catch(() => null) as { error?: { code?: string; message?: string } } | null
        domainStatus = `❌ 失敗（HTTP ${domainRes.status} ${body?.error?.code ?? ''} ${body?.error?.message ?? ''}）`.replace(/\s+）/, '）')
        console.error('Vercel domain add failed:', subdomain, domainRes.status, body)
      }
    } catch (err) {
      domainStatus = `❌ 失敗（${err instanceof Error ? err.message : String(err)}）`
      console.error('Vercel domain add error:', subdomain, err)
    }
  } else {
    domainStatus = '❌ 未実行（VERCEL_TOKEN / VERCEL_LEAGUE_PROJECT_ID が未設定）'
    console.error('Vercel domain add skipped: env not set', subdomain)
  }

  // 7. 運営者への申し込み通知
  await resend.emails.send({
    from: 'noreply@leaguru.jp',
    to: 'support@leaguru.jp',
    subject: `【leaguru 新規申し込み】${leagueName}`,
    text: [
      `新規申し込みがありました。`,
      ``,
      `リーグ名: ${leagueName}`,
      `担当者: ${contact}`,
      `メール: ${email}`,
      `電話: ${phone || '未記入'}`,
      `規模: ${size || '未記入'}`,
      `契約プラン: ${isPlanKey(planKey) ? `${PLAN_BY_KEY[planKey].teamsLabel} ${PLAN_BY_KEY[planKey].priceLabel}/年` : '不明'}`,
      `スラグ: ${league.slug}`,
      `管理画面: https://${league.slug}.leaguru.jp/admin/login`,
      `サブドメイン: ${subdomain} ${domainStatus}`,
      `管理者アカウント: ${passwordToSend ? '新規作成（仮パスワードを送信）' : '既存アカウントにつないだ（パスワードは変えていない）'}`,
      ...(domainStatus === '追加済み' ? [] : [
        `→ Vercel の league-saas プロジェクトの Domains に ${subdomain} を手で追加してください`,
      ]),
    ].join('\n'),
  }).catch(err => console.error('Admin notify error:', err))

  // 8. ウェルカムメール送信
  // ここで throw すると500になり、Stripeのリトライ時には上の「完了済み」判定に
  // 引っかかって二度と送られない（仮パスワードは再現できない）。
  // そのため送信失敗は握りつぶさず、運営に手動リカバリを促す通知を出して200で終える
  const welcome = await resend.emails.send({
    from: 'noreply@leaguru.jp',
    to: email,
    subject: `【Leaguru】${leagueName} の管理画面が開設されました`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1a6b3a">お申し込みありがとうございます！</h2>
        <p>${contact} 様</p>
        <p><strong>${leagueName}</strong> の管理画面が開設されました。</p>
        <p>管理画面の準備ができました。以下のURLとアカウント情報でログインしてください。</p>
        <div style="background:#f4f6fa;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:14px">
          <p style="margin:0 0 8px"><strong>管理画面URL:</strong> <a href="https://${league.slug}.leaguru.jp/admin/login">https://${league.slug}.leaguru.jp/admin/login</a></p>
          <p style="margin:0 0 8px"><strong>ログインメールアドレス:</strong> ${email}</p>
          ${passwordToSend
            ? `<p style="margin:0"><strong>仮パスワード:</strong> <span style="font-family:monospace;background:#e8f0e8;padding:2px 8px;border-radius:4px">${passwordToSend}</span></p>`
            : `<p style="margin:0"><strong>パスワード:</strong> このメールアドレスのアカウントはすでにお持ちです。今お使いのパスワードでログインできます。</p>`}
        </div>
        <p style="color:#888;font-size:13px">※URLが有効になるまで数分かかる場合があります。しばらく経ってからアクセスしてください。</p>
        ${passwordToSend
          ? `<p style="color:#888;font-size:13px">※初回ログイン後にパスワードの変更をお勧めします。</p>`
          : `<p style="color:#888;font-size:13px">※パスワードをお忘れの場合は <a href="mailto:support@leaguru.jp">support@leaguru.jp</a> までご連絡ください。</p>`}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#555;font-size:13px">
          リーグ名: ${leagueName}<br>
          担当者: ${contact}<br>
          規模: ${size}<br>
          ${phone ? `電話: ${phone}<br>` : ''}
        </p>
        <p style="color:#aaa;font-size:12px">Leaguru サポート: support@leaguru.jp</p>
      </div>
    `,
  }).catch(err => ({ error: err as unknown }))

  if (welcome && 'error' in welcome && welcome.error) {
    console.error('ウェルカムメール送信失敗（要手動対応）:', league.slug, email, welcome.error)
    await resend.emails.send({
      from: 'noreply@leaguru.jp',
      to: 'support@leaguru.jp',
      subject: `【要対応】ウェルカムメール送信失敗: ${leagueName}`,
      text: [
        `${leagueName} のリーグ作成と管理者アカウント作成は完了していますが、`,
        `申込者へのウェルカムメールだけ送信に失敗しました。`,
        ``,
        `宛先: ${email}`,
        `スラグ: ${league.slug}`,
        `管理画面: https://${league.slug}.leaguru.jp/admin/login`,
        ``,
        ...(passwordToSend
          ? [`仮パスワードは再現できないため、Supabaseからパスワード再設定を行い、`,
             `ログイン情報を手動で案内してください。`]
          : [`既存アカウントにつないだので、パスワードはご本人が今お使いのものです。`,
             `管理画面のURLだけ手動で案内してください。`]),
      ].join('\n'),
    }).catch(err => console.error('サポート通知も失敗:', err))
  }

  res.json({ received: true })
}
