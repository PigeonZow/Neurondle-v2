import { NextRequest, NextResponse } from 'next/server'
import { testActivation, filterBosToken } from '@/lib/services/neuronpedia'
import { findSae } from '@/config/saes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { modelId, layer, featureIndex, text } = body

    if (!modelId || !layer || featureIndex === undefined || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, layer, featureIndex, text' },
        { status: 400 }
      )
    }

    // Find matching SAE config
    const config = findSae(modelId, layer)
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

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Activation test error:', error)
    return NextResponse.json(
      { error: 'Activation test failed' },
      { status: 500 }
    )
  }
}
