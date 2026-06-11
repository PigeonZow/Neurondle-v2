import { NextRequest, NextResponse } from 'next/server'
import { testActivation, filterBosToken } from '@/lib/services/neuronpedia'
import { createServerClient } from '@/lib/db/supabase'
import { SAE_CONFIGS } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { modelId, layer, featureIndex, text, sessionId, gameId, puzzleId, roundNumber } = body

    if (!modelId || !layer || featureIndex === undefined || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, layer, featureIndex, text' },
        { status: 400 }
      )
    }

    // Find matching SAE config
    const config = SAE_CONFIGS.find(c => c.modelId === modelId && c.layer === layer)
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid model/layer combination' },
        { status: 400 }
      )
    }

    // Call Neuronpedia API
    const response = await testActivation(config, featureIndex, text)

    // Filter out BOS token
    const filtered = filterBosToken(response)

    // Persist research metadata for this probe. We collect this for EVERY run;
    // whether it's usable for research is decided later via the session's
    // research_consent flag (rows join back to sessions via session_id).
    //
    // PRIVACY: we deliberately never store the raw text or the token strings
    // (which would let the text be reconstructed). Only counts and the numeric
    // activation values per token position are stored.
    if (sessionId && puzzleId && roundNumber && !String(puzzleId).startsWith('mock')) {
      try {
        const supabase = createServerClient()
        await supabase.from('activation_tests').insert({
          session_id: sessionId,
          puzzle_id: puzzleId,
          round_number: roundNumber,
          game_id: gameId ?? null,
          text_length: typeof text === 'string' ? text.length : 0,
          token_count: filtered.tokens.length,
          max_activation: filtered.maxValue,
          token_activations: filtered.values, // numeric activations only — no token strings
        })
      } catch (persistError) {
        // Never fail the user-facing activation test because of a logging write.
        console.error('Failed to persist activation test:', persistError)
      }
    }

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Activation test error:', error)
    return NextResponse.json(
      { error: 'Activation test failed' },
      { status: 500 }
    )
  }
}
