import { NextRequest, NextResponse } from 'next/server'
import { searchAllActivations } from '@/lib/services/neuronpedia'
import { findSae } from '@/config/saes'
import { createServerClient } from '@/lib/db/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { modelId, layer, text, sessionId, gameId, puzzleId, roundNumber } = body

    if (!modelId || !layer || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, layer, text' },
        { status: 400 }
      )
    }

    const config = findSae(modelId, layer)
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid model/layer combination' },
        { status: 400 }
      )
    }

    const probe = await searchAllActivations(config, text)

    // Research logging — same consent model as /api/activation: store for
    // every run, filter by sessions.research_consent at analysis time.
    // probe_results keeps only {index, maxValue} per feature to bound row size.
    if (sessionId && puzzleId && roundNumber && !String(puzzleId).startsWith('mock')) {
      try {
        const supabase = createServerClient()
        await supabase.from('activation_tests').insert({
          session_id: sessionId,
          puzzle_id: puzzleId,
          round_number: roundNumber,
          game_id: gameId ?? null,
          test_kind: 'probe',
          text_input: typeof text === 'string' ? text : null,
          text_length: typeof text === 'string' ? text.length : 0,
          token_count: probe.tokens.length,
          max_activation: probe.results[0]?.maxValue ?? 0,
          token_activations: null,
          probe_results: probe.results.map(r => ({ index: r.index, maxValue: r.maxValue })),
        })
      } catch (persistError) {
        // Never fail the user-facing probe because of a logging write.
        console.error('Failed to persist probe:', persistError)
      }
    }

    return NextResponse.json(probe)
  } catch (error) {
    console.error('Probe error:', error)
    return NextResponse.json({ error: 'Probe failed' }, { status: 500 })
  }
}
