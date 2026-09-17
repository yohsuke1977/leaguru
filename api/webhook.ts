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

// 途中失敗した申し込みを再開するときの照合用。supabase-js の admin API には
// メールでの検索が無いのでページングして探す（登録ユーザー数は少ない想定）
async function findUserByEmail(email: string) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) return null
    const hit = data.users.find(u => u.email?.toLowerCase() === target)
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

// 更新時の帯判定用: 直近のシーズン／トーナメントに登録された異なるチーム数の大きい方。
// teams テーブルの行数は使わない（解散チームが残り続けるため）。
// シーズンが空のまま（次年度をまだ作っていない）でも、直前の実績で判定する。
async function countRecentTeams(leagueId: number): Promise<number> {
  let best = 0
  const { data: seasons } = await supabase.from('seasons').select('id').eq('league_id', leagueId).order('id', { ascending: false }).limit(5)
  for (const s of seasons ?? []) {
    const { data: divs } = await supabase.from('divisions').select('id').eq('season_id', s.id)
    const divIds = (divs ?? []).map(d => d.id)
    if (!divIds.length) continue
    const { data: dt } = await supabase.from('division_teams').select('team_id').in('division_id', divIds)
    const n = new Set((dt ?? []).map(r => r.team_id)).size
    if (n > 0) { best = Math.max(best, n); break }
  }
  const { data: tours } = await supabase.from('tournaments').select('id').eq('league_id', leagueId).order('id', { ascending: false }).limit(5)
  for (const t of tours ?? []) {
    const { data: groups } = await supabase.from('tournament_groups').select('id').eq('tournament_id', t.id)
    const gIds = (groups ?? []).map(g => g.id)
    if (!gIds.length) continue
    const { data: gt } = await supabase.from('tournament_group_teams').select('team_id').in('group_id', gIds)
    const n = new Set((gt ?? []).map(r => r.team_id)).size
    if (n > 0) { best = Math.max(best, n); break }
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

  // ── invoice.payment_failed ──────────────────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    if (customerId) {
      const { data: league } = await supabase
        .from('leagues')
        .select('id, name, slug')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
      if (league) {
        const { data: settings } = await supabase
          .from('site_settings')
          .select('value')
          .eq('league_id', league.id)
          .eq('key', 'contact_email')
          .maybeSingle()
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
      await supabase.from('leagues').update({
        stripe_subscription_id: sub.id,
        current_period_end: subPeriodEndISO(sub),
        cancel_at_period_end: sub.cancel_at_period_end,
      }).eq('stripe_customer_id', customerId)
    }
    return res.json({ received: true })
  }

  // ── customer.subscription.deleted ────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
    if (customerId) {
      const { data: league } = await supabase
        .from('leagues')
        .select('id, name, slug')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
      if (league) {
        await supabase
          .from('leagues')
          .update({ status: 'suspended', suspended_at: new Date().toISOString() })
          .eq('id', league.id)

        const { data: settings } = await supabase
          .from('site_settings')
          .select('value')
          .eq('league_id', league.id)
          .eq('key', 'contact_email')
          .maybeSingle()
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
                <p>現在のデータは<strong>30日間</strong>保持されます。この期間内に再度お申し込みいただくことで、データを引き継いでサービスを再開できます。</p>
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
      const { data: league } = await supabase
        .from('leagues')
        .select('id, name, plan, stripe_subscription_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
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
              await supabase.from('leagues').update({ plan: target.key }).eq('id', league.id)
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

  let league: { id: number; slug: string } | null = null
  if (stripeSubscriptionId) {
    const { data: found } = await supabase
      .from('leagues')
      .select('id, slug')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .maybeSingle()
    league = found ?? null
  }

  if (league) {
    // 管理者まで作られていれば完全に完了済み。仮パスワードの再発行もメール再送もしない
    const { data: provisioned } = await supabase
      .from('league_admins')
      .select('user_id')
      .eq('league_id', league.id)
      .limit(1)
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
      return res.status(500).json({ error: 'League creation failed' })
    }
    league = created
  }

  // 2. site_settings 初期化（再開時に二重登録しない）
  const { data: existingSettings } = await supabase
    .from('site_settings')
    .select('key')
    .eq('league_id', league.id)
    .limit(1)
  if (!existingSettings?.length) {
    await supabase.from('site_settings').insert([
      { key: 'site_title', value: leagueName, league_id: league.id },
      { key: 'layout', value: 'standard', league_id: league.id },
      { key: 'team_admin_enabled', value: 'false', league_id: league.id },
      { key: 'contact_email', value: email, league_id: league.id },
    ])
  }

  // 3. 仮パスワード生成
  const tmpPassword = Math.random().toString(36).slice(2, 8).toUpperCase() +
    Math.random().toString(36).slice(2, 8) + '!'

  // 4. 管理者アカウント作成
  // 再開時は同じメールのユーザーが既にできていることがある。その場合は作り直さず
  // 仮パスワードだけ再設定して使い回す（ウェルカムメールの記載と一致させるため）
  let adminUserId: string
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: tmpPassword,
    email_confirm: true,
  })

  if (authUser?.user) {
    adminUserId = authUser.user.id
  } else {
    const existingUser = await findUserByEmail(email)
    if (!existingUser) {
      console.error('Auth user error:', authErr)
      return res.status(500).json({ error: 'User creation failed' })
    }
    const { error: pwErr } = await supabase.auth.admin.updateUserById(existingUser.id, { password: tmpPassword })
    if (pwErr) {
      console.error('Auth password reset error:', pwErr)
      return res.status(500).json({ error: 'User creation failed' })
    }
    adminUserId = existingUser.id
  }

  // 5. league_admins に紐付け
  await supabase.from('league_admins').insert({
    user_id: adminUserId,
    league_id: league.id,
  })

  // 6. Vercel にサブドメインを追加（SSL自動発行）
  const vercelToken = process.env.VERCEL_TOKEN
  const vercelProjectId = process.env.VERCEL_LEAGUE_PROJECT_ID
  const vercelTeamId = process.env.VERCEL_TEAM_ID
  if (vercelToken && vercelProjectId) {
    const teamParam = vercelTeamId ? `?teamId=${vercelTeamId}` : ''
    await fetch(`https://api.vercel.com/v9/projects/${vercelProjectId}/domains${teamParam}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: `${league.slug}.leaguru.jp` }),
    }).catch(err => console.error('Vercel domain add error:', err))
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
          <p style="margin:0"><strong>仮パスワード:</strong> <span style="font-family:monospace;background:#e8f0e8;padding:2px 8px;border-radius:4px">${tmpPassword}</span></p>
        </div>
        <p style="color:#888;font-size:13px">※URLが有効になるまで数分かかる場合があります。しばらく経ってからアクセスしてください。</p>
        <p style="color:#888;font-size:13px">※初回ログイン後にパスワードの変更をお勧めします。</p>
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
        `仮パスワードは再現できないため、Supabaseからパスワード再設定を行い、`,
        `ログイン情報を手動で案内してください。`,
      ].join('\n'),
    }).catch(err => console.error('サポート通知も失敗:', err))
  }

  res.json({ received: true })
}
