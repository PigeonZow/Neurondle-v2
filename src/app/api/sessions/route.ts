import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/supabase'
import { getTodayDate } from '@/lib/services/puzzles'

// GET - Fetch or create session
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token')

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Missing session token' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const today = getTodayDate()

    // Try to find existing session
    const { data: existing } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('date', today)
      .single()

    if (existing) {
      return NextResponse.json(existing)
    }

    // Create new session
    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        session_token: sessionToken,
        date: today,
        current_round: 1,
        total_score: 0,
        completed: false,
        research_consent: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Session creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json(newSession)
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'Session operation failed' },
      { status: 500 }
    )
  }
}

// POST - Update session
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

    const supabase = createServerClient()
    const today = getTodayDate()

    const { error } = await supabase
      .from('sessions')
      .update({
        current_round: body.currentRound,
        total_score: body.totalScore,
        completed: body.completed,
        research_consent: body.researchConsent,
        updated_at: new Date().toISOString(),
      })
      .eq('session_token', sessionToken)
      .eq('date', today)

    if (error) {
      console.error('Session update error:', error)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session update error:', error)
    return NextResponse.json(
      { error: 'Session update failed' },
      { status: 500 }
    )
  }
}
