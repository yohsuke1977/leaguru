import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

// apiVersion を明示pin。SDK更新で既定APIが変わると型エラーになり、変更に必ず気づける
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { leagueName, contact, email, phone, size, slug, attribution } = req.body

  if (!leagueName || !contact || !email || !slug) {
    return res.status(400).json({ error: '必須項目が不足しています' })
  }

  // LP着地時に捕捉した流入元（sessionStorage lg_attr）。Stripe metadata は文字列500字上限
  const att = attribution && typeof attribution === 'object' ? attribution : {}
  const attStr = (v: unknown) => (typeof v === 'string' ? v.slice(0, 450) : '')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: { trial_period_days: 30 },
    customer_email: email,
    metadata: {
      leagueName, contact, phone: phone ?? '', size: size ?? '', slug,
      referrer: attStr(att.ref), landing_page: attStr(att.lp),
      utm_source: attStr(att.us), utm_medium: attStr(att.um), utm_campaign: attStr(att.uc),
    },
    success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/#apply`,
    locale: 'ja',
  })

  res.json({ url: session.url })
}
