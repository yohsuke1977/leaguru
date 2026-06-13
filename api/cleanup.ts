import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Called daily by Vercel Cron. Deletes all data for leagues suspended > 30 days ago.
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
    .select('id, name, slug')
    .eq('status', 'suspended')
    .lt('suspended_at', cutoff)

  if (error) {
    console.error('Cleanup query error:', error)
    return res.status(500).json({ error: 'Query failed' })
  }

  if (!leagues || leagues.length === 0) {
    return res.json({ deleted: 0 })
  }

  const deleted: string[] = []

  for (const league of leagues) {
    const id = league.id

    // Delete in dependency order
    await supabase.from('tournament_game_pitching').delete().eq('league_id', id)
    await supabase.from('tournament_game_batting').delete().eq('league_id', id)
    await supabase.from('tournament_games').delete().eq('league_id', id)
    await supabase.from('tournament_group_teams').delete().eq('league_id', id)
    await supabase.from('tournament_groups').delete().eq('league_id', id)
    await supabase.from('tournaments').delete().eq('league_id', id)
    await supabase.from('game_pitching').delete().eq('league_id', id)
    await supabase.from('game_batting').delete().eq('league_id', id)
    await supabase.from('games').delete().eq('league_id', id)
    await supabase.from('schedules').delete().eq('league_id', id)
    await supabase.from('division_teams').delete().eq('league_id', id)
    await supabase.from('divisions').delete().eq('league_id', id)
    await supabase.from('seasons').delete().eq('league_id', id)
    await supabase.from('players').delete().eq('league_id', id)
    await supabase.from('team_invitations').delete().eq('league_id', id)
    await supabase.from('team_admins').delete().eq('league_id', id)
    await supabase.from('teams').delete().eq('league_id', id)
    await supabase.from('posts').delete().eq('league_id', id)
    await supabase.from('contact_messages').delete().eq('league_id', id)
    await supabase.from('site_settings').delete().eq('league_id', id)
    await supabase.from('league_admins').delete().eq('league_id', id)
    await supabase.from('leagues').delete().eq('id', id)

    console.log(`Deleted league: ${league.name} (${league.slug})`)
    deleted.push(league.slug)
  }

  return res.json({ deleted: deleted.length, slugs: deleted })
}
