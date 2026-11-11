import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { normalizeSlug, slugFormatProblem } from '../src/lib/slug.js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// 申込フォームの入力中の確認。判定は src/lib/slug.ts（checkout.ts と共通）
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = normalizeSlug(req.query.slug)
  const problem = slugFormatProblem(slug)
  if (problem) return res.json({ available: false, reason: problem })

  const { data } = await supabase.from('leagues').select('id').eq('slug', slug).maybeSingle()
  return res.json({ available: !data })
}
