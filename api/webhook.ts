import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// apiVersion を明示pin。SDK更新で既定APIが変わると型エラーになり、変更に必ず気づける
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export const config = { api: { bodyParser: false } }

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

  if (event.type !== 'checkout.session.completed') return res.json({ received: true })

  const session = event.data.object as Stripe.Checkout.Session
  const { leagueName, contact, phone, size, slug: chosenSlug } = session.metadata ?? {}
  const email = session.customer_email ?? ''

  if (!leagueName || !email) return res.status(400).json({ error: 'Missing metadata' })

  // 1. リーグ作成
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null
  let periodEnd: string | null = null
  if (stripeSubscriptionId) {
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    periodEnd = subPeriodEndISO(sub)
  }
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .insert({
      name: leagueName,
      slug: chosenSlug || toSlug(leagueName),
      plan: 'standard',
      status: 'active',
      stripe_customer_id: stripeCustomerId ?? null,
      stripe_subscription_id: stripeSubscriptionId ?? null,
      current_period_end: periodEnd,
    })
    .select('id, slug')
    .single()

  if (leagueErr || !league) {
    console.error('League insert error:', leagueErr)
    return res.status(500).json({ error: 'League creation failed' })
  }

  // 2. site_settings 初期化
  await supabase.from('site_settings').insert([
    { key: 'site_title', value: leagueName, league_id: league.id },
    { key: 'layout', value: 'standard', league_id: league.id },
    { key: 'team_admin_enabled', value: 'false', league_id: league.id },
    { key: 'contact_email', value: email, league_id: league.id },
  ])

  // 3. 仮パスワード生成
  const tmpPassword = Math.random().toString(36).slice(2, 8).toUpperCase() +
    Math.random().toString(36).slice(2, 8) + '!'

  // 4. 管理者アカウント作成
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: tmpPassword,
    email_confirm: true,
  })

  if (authErr || !authUser.user) {
    console.error('Auth user error:', authErr)
    return res.status(500).json({ error: 'User creation failed' })
  }

  // 5. league_admins に紐付け
  await supabase.from('league_admins').insert({
    user_id: authUser.user.id,
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
      `スラグ: ${league.slug}`,
      `管理画面: https://${league.slug}.leaguru.jp/admin/login`,
    ].join('\n'),
  }).catch(err => console.error('Admin notify error:', err))

  // 8. ウェルカムメール送信
  await resend.emails.send({
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
  })

  res.json({ received: true })
}
