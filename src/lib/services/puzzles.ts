import type { Puzzle, Hint, SAEConfig, NeuronpediaActivation, TokenActivation } from '@/types'
import { SAE_CONFIGS } from '@/types'
import * as neuronpedia from './neuronpedia'

/**
 * Generate hints from Neuronpedia activation data
 * Orders hints from weakest to strongest for progressive difficulty
 */
export function generateHints(
  activations: NeuronpediaActivation[],
  maxHints = 10
): Hint[] {
  // 1. Filter positive activations
  const positive = activations.filter(a => a.maxValue > 0)

  // 2. Sort by strength (strongest first)
  positive.sort((a, b) => b.maxValue - a.maxValue)

  // 3. Deduplicate by normalized text
  const seen = new Set<string>()
  const unique = positive.filter(a => {
    const key = a.tokens.join('').trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // 4. Take top N
  const selected = unique.slice(0, maxHints)

  // 5. Reverse for progressive difficulty (weakest first)
  selected.reverse()

  // 6. Format
  return selected.map((a, i) => ({
    id: `hint_${i + 1}`,
    text: a.tokens.join(''),
    score: a.maxValue,
    tokens: a.tokens.map((t, j): TokenActivation => ({
      token: t,
      activation: a.values[j] ?? 0,
    })),
    level: i + 1,
  }))
}

/**
 * Get a random SAE configuration
 */
export function getRandomSAEConfig(): SAEConfig {
  const index = Math.floor(Math.random() * SAE_CONFIGS.length)
  return SAE_CONFIGS[index]
}

/**
 * Generate a puzzle for a specific date and round
 */
export async function generatePuzzle(
  date: string,
  roundNumber: number,
  usedFeatures: Set<string>,
  umapData: Map<number, { x: number; y: number }>
): Promise<Puzzle> {
  const config = getRandomSAEConfig()
  const minQuality = parseFloat(process.env.MIN_EXPLANATION_SCORE || '0.7')

  for (let attempt = 0; attempt < 50; attempt++) {
    // Pick random unused feature
    let featureIndex: number
    do {
      featureIndex = Math.floor(Math.random() * config.maxFeatures)
    } while (usedFeatures.has(`${config.modelId}/${config.layer}/${featureIndex}`))

    try {
      // Get feature data
      const feature = await neuronpedia.getFeature(config, featureIndex)

      // Check quality
      const explanation = feature.explanations?.[0]
      if (!explanation?.description) continue

      const explanationScore = explanation.scores?.[0]?.value ?? 0
      if (explanationScore < minQuality) continue

      // Generate hints
      const hints = generateHints(feature.activations || [])
      if (hints.length < 3) continue

      // Get UMAP coordinates
      const umapPoint = umapData.get(featureIndex)
      if (!umapPoint) continue

      return {
        id: crypto.randomUUID(),
        date,
        roundNumber,
        modelId: config.modelId,
        layer: config.layer,
        featureIndex,
        groundTruthLabel: explanation.description,
        answerX: umapPoint.x,
        answerY: umapPoint.y,
        hints,
      }
    } catch (error) {
      // Feature fetch failed, try another
      continue
    }
  }

  throw new Error('Failed to generate quality puzzle after 50 attempts')
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}
