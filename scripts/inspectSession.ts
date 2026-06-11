/**
 * Inspect the data collected for a session — useful for manually verifying the
 * data-collection pipeline.
 *
 * Usage:
 *   npx tsx scripts/inspectSession.ts <session_token>
 *   npx tsx scripts/inspectSession.ts            # lists today's sessions
 *
 * The session token is shown in the consent modal and the bottom-right badge
 * in the running game.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, key)

  const token = process.argv[2]

  if (!token) {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('sessions')
      .select('session_token, research_consent, total_score, completed, created_at')
      .eq('date', today)
      .order('created_at', { ascending: false })
    console.log(`\nSessions for ${today}:`)
    console.table(data ?? [])
    console.log('\nRe-run with a session_token to see its rounds + activation tests.')
    return
  }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_token', token)
    .order('created_at', { ascending: false })

  if (!sessions || sessions.length === 0) {
    console.log(`No session found for token: ${token}`)
    return
  }

  for (const s of sessions) {
    console.log('\n=== SESSION ===')
    console.log({
      id: s.id,
      date: s.date,
      research_consent: s.research_consent, // <-- the opt-in/out flag
      total_score: s.total_score,
      completed: s.completed,
    })

    const { data: rounds } = await supabase
      .from('round_attempts')
      .select('game_id, round_number, pin_x, pin_y, distance, score, created_at')
      .eq('session_id', s.id)
      .order('created_at')
    const gameCount = new Set((rounds ?? []).map((r) => r.game_id)).size
    console.log(`\n  round_attempts (${rounds?.length ?? 0} across ${gameCount} game(s)):`)
    console.table(rounds ?? [])

    // Per-game score rollup (the authoritative per-playthrough total)
    const perGame = new Map<string, { rounds: number; score: number }>()
    for (const r of rounds ?? []) {
      const key = r.game_id ?? '(no game_id)'
      const acc = perGame.get(key) ?? { rounds: 0, score: 0 }
      acc.rounds += 1
      acc.score += r.score
      perGame.set(key, acc)
    }
    console.log('  per-game totals:')
    console.table(
      [...perGame.entries()].map(([game_id, v]) => ({ game_id, ...v }))
    )

    const { data: acts } = await supabase
      .from('activation_tests')
      .select('game_id, round_number, text_length, token_count, max_activation, created_at')
      .eq('session_id', s.id)
      .order('created_at')
    console.log(`  activation_tests (${acts?.length ?? 0}) — metadata only, no raw text:`)
    console.table(acts ?? [])
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
