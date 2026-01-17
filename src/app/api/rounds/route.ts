import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/supabase'

// POST - Record round attempt
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

    const { sessionId, puzzleId, roundNumber, pinX, pinY, distance, score } = body

    if (!sessionId || !puzzleId || !roundNumber || pinX === undefined || pinY === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('round_attempts')
      .insert({
        session_id: sessionId,
        puzzle_id: puzzleId,
        round_number: roundNumber,
        pin_x: pinX,
        pin_y: pinY,
        distance,
        score,
      })
      .select()
      .single()

    if (error) {
      console.error('Round attempt error:', error)
      return NextResponse.json(
        { error: 'Failed to record round attempt' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Round attempt error:', error)
    return NextResponse.json(
      { error: 'Round recording failed' },
      { status: 500 }
    )
  }
}
