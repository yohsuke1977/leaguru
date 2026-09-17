import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { PLAN_BY_KEY, isPlanKey } from '../src/lib/plans.js'

// apiVersion を明示pin。SDK更新で既定APIが変わると型エラーになり、変更に必ず気づける
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { leagueName, contact, email, phone, size, slug, attribution } = req.body

  if (!leagueName || !contact || !email || !slug) {
    return res.status(400).json({ error: '必須項目が不足しています' })
  }

  // リーグ規模＝課金プラン。どのPriceで決済するかが決まるので必須
  if (!isPlanKey(size)) {
    return res.status(400).json({ error: 'リーグ規模を選択してください' })
  }
  const plan = PLAN_BY_KEY[size]
  const priceId = process.env[plan.envKey]
  if (!priceId) {
    // Stripe側にPriceを作り忘れている状態。黙って別の金額で決済させない
    console.error(`Stripe Price 未設定: ${plan.envKey}（プラン ${plan.key} / ${plan.priceLabel}）`)
    return res.status(500).json({ error: '価格設定が未構成です。お手数ですがお問い合わせください' })
  }

  // LP着地時に捕捉した流入元（sessionStorage lg_attr）。Stripe metadata は文字列500字上限
  const att = attribution && typeof attribution === 'object' ? attribution : {}
  const attStr = (v: unknown) => (typeof v === 'string' ? v.slice(0, 450) : '')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 30 },
    customer_email: email,
    metadata: {
      leagueName, contact, phone: phone ?? '', size, plan: plan.key, slug,
      referrer: attStr(att.ref), landing_page: attStr(att.lp),
      utm_source: attStr(att.us), utm_medium: attStr(att.um), utm_campaign: attStr(att.uc),
    },
    success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/#apply`,
    locale: 'ja',
  })

  res.json({ url: session.url })
}
