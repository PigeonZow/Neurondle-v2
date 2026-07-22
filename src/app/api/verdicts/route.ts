import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/supabase'

// POST - Record a label verdict (and optionally a suggested label)
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token')
    const body = await request.json()

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Missing session token' },
        { status: 400 }
      )
    }

    const { sessionId, gameId, puzzleId, roundNumber, verdict, suggestedLabel } = body

    if (!sessionId || !puzzleId || !roundNumber || !verdict) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['fits', 'off', 'unsure'].includes(verdict)) {
      return NextResponse.json(
        { error: 'Invalid verdict' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('label_verdicts')
      .insert({
        session_id: sessionId,
        puzzle_id: puzzleId,
        round_number: roundNumber,
        game_id: gameId ?? null,
        verdict,
        suggested_label: suggestedLabel ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('Label verdict error:', error)
      return NextResponse.json(
        { error: 'Failed to record verdict' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Label verdict error:', error)
    return NextResponse.json(
      { error: 'Verdict recording failed' },
      { status: 500 }
    )
  }
}
