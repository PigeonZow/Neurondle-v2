import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/supabase'

// GET - Community stats for one puzzle: attempt aggregates plus label-verdict
// consensus. Anonymous aggregates only; no session token required.
export async function GET(request: NextRequest) {
  try {
    const puzzleId = request.nextUrl.searchParams.get('puzzleId')
    if (!puzzleId) {
      return NextResponse.json({ error: 'Missing puzzleId' }, { status: 400 })
    }

    const supabase = createServerClient()

    const [attemptsRes, verdictsRes] = await Promise.all([
      supabase
        .from('round_attempts')
        .select('score')
        .eq('puzzle_id', puzzleId)
        .limit(5000),
      supabase
        .from('label_verdicts')
        .select('session_id, game_id, verdict')
        .eq('puzzle_id', puzzleId)
        .order('created_at', { ascending: true })
        .limit(5000),
    ])

    if (attemptsRes.error) {
      console.error('Puzzle stats error:', attemptsRes.error)
      return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
    }

    const scores = (attemptsRes.data ?? []).map(r => r.score as number)
    const attempts = scores.length
    const avgScore = attempts
      ? Math.round(scores.reduce((a, b) => a + b, 0) / attempts)
      : null
    // 7000 is the 'Close' verdict floor in lib/services/scoring.ts
    const closeOrBetterPct = attempts
      ? Math.round((scores.filter(s => s >= 7000).length / attempts) * 100)
      : null

    // Verdicts are append-only; the latest row per (session, game) wins.
    // A missing label_verdicts table (migration 005 not applied yet) just
    // means an empty consensus, not a failed request.
    const latest = new Map<string, string>()
    for (const row of verdictsRes.data ?? []) {
      latest.set(`${row.session_id}:${row.game_id}`, row.verdict as string)
    }
    const verdicts = { fits: 0, off: 0, unsure: 0, total: 0 }
    for (const v of latest.values()) {
      if (v === 'fits' || v === 'off' || v === 'unsure') {
        verdicts[v]++
        verdicts.total++
      }
    }

    return NextResponse.json({ attempts, avgScore, closeOrBetterPct, verdicts })
  } catch (error) {
    console.error('Puzzle stats error:', error)
    return NextResponse.json({ error: 'Stats lookup failed' }, { status: 500 })
  }
}
