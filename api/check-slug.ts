import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const RESERVED = ['www', 'api', 'app', 'demo', 'admin', 'mail', 'smtp', 'sbl', 'support', 'help', 'status', 'blog', 'leaguru']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = (req.query.slug as string ?? '').toLowerCase().trim()

  if (!slug) return res.json({ available: false, reason: 'empty' })
  if (!/^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(slug)) {
    return res.json({ available: false, reason: 'invalid' })
  }
  if (RESERVED.includes(slug)) {
    return res.json({ available: false, reason: 'reserved' })
  }

  const { data } = await supabase.from('leagues').select('id').eq('slug', slug).maybeSingle()
  return res.json({ available: !data })
}
