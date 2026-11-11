import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PLAN_BY_KEY, isPlanKey } from '../src/lib/plans.js'
import { normalizeSlug, slugFormatProblem } from '../src/lib/slug.js'

// apiVersion を明示pin。SDK更新で既定APIが変わると型エラーになり、変更に必ず気づける
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { leagueName, contact, email, phone, size, attribution } = req.body ?? {}
  const slug = normalizeSlug(req.body?.slug)

  if (!leagueName || !contact || !email || !slug) {
    return res.status(400).json({ error: '必須項目が不足しています' })
  }

  // URL はブラウザでも確かめているが、決済画面を開く直前にもう一度確かめる（leaguru#6）。
  // 入力したときに空いていても、その後に別の申込で使われていることがある。
  // ここで弾かないと、決済後の webhook でリーグ作成が失敗し、お客さんには何も届かない
  const problem = slugFormatProblem(slug)
  if (problem) {
    return res.status(400).json({ error: problem === 'reserved' ? 'このURLは使えません。別のURLを選んでください' : 'URLの形式が正しくありません（半角英小文字・数字・ハイフン、3〜20文字）' })
  }
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: taken, error: takenErr } = await supabase.from('leagues').select('id').eq('slug', slug).maybeSingle()
  if (takenErr) {
    console.error('slug 確認失敗:', takenErr)
    return res.status(500).json({ error: 'エラーが発生しました。時間をおいて再度お試しください' })
  }
  if (taken) {
    return res.status(400).json({ error: 'このURLは使えなくなりました（ほかの申込で使われました）。別のURLを選んでください' })
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
