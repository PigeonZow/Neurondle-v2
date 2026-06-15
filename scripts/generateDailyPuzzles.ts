import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'
import { activeSae, NEURONPEDIA, neuronpediaHeaders } from '../src/config/saes'

// Lower threshold - many features don't have scores
const MIN_QUALITY = parseFloat(process.env.MIN_EXPLANATION_SCORE || '0')

interface NeuronpediaFeature {
  modelId: string
  layer: string
  index: string
  explanations?: { description: string; scores?: { value: number }[] }[]
  activations?: {
    tokens: string[]
    values: number[]
    maxValue: number
  }[]
}

async function generateDailyPuzzles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const date = new Date().toISOString().split('T')[0]

  console.log(`Generating puzzles for ${date}...`)

  // Check if puzzles already exist
  const { data: existing } = await supabase
    .from('puzzles')
    .select('id')
    .eq('date', date)

  if (existing && existing.length > 0) {
    console.log('Puzzles already exist for today. Deleting and regenerating...')
    await supabase.from('puzzles').delete().eq('date', date)
  }

  // Get used features
  const { data: usedData } = await supabase
    .from('used_features')
    .select('feature_keys')
    .eq('id', 1)
    .single()

  const usedFeatures = new Set<string>(usedData?.feature_keys || [])

  // Get UMAP data for coordinate lookup
  const saeConfig = activeSae()
  const headers = neuronpediaHeaders()

  console.log(`Fetching UMAP data for ${saeConfig.id}...`)
  const umapResponse = await fetch(`${NEURONPEDIA.baseUrl}/umap`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ modelId: saeConfig.modelId, layers: [saeConfig.layer] }),
  })

  if (!umapResponse.ok) {
    console.error('Failed to fetch UMAP data:', umapResponse.statusText)
    process.exit(1)
  }

  const umapData = await umapResponse.json()
  const umapPoints = new Map<number, { x: number; y: number }>()

  for (const point of umapData[saeConfig.layer] || []) {
    umapPoints.set(Number(point.index), { x: point.umap_x, y: point.umap_y })
  }

  console.log(`Loaded ${umapPoints.size} UMAP points`)

  // Generate 3 puzzles
  let successCount = 0
  for (const roundNumber of [1, 2, 3]) {
    console.log(`\nGenerating round ${roundNumber}...`)
    let generated = false

    for (let attempt = 0; attempt < 100; attempt++) {
      // Pick random unused feature
      let featureIndex: number
      let attempts = 0
      do {
        featureIndex = Math.floor(Math.random() * saeConfig.maxFeatures)
        attempts++
        if (attempts > 1000) {
          console.error('Too many attempts to find unused feature')
          break
        }
      } while (usedFeatures.has(`${saeConfig.modelId}/${saeConfig.layer}/${featureIndex}`))

      try {
        // Get feature data
        const featureResponse = await fetch(
          `${NEURONPEDIA.baseUrl}/feature/${saeConfig.modelId}/${saeConfig.layer}/${featureIndex}`,
          { headers }
        )

        if (!featureResponse.ok) {
          console.log(`  Attempt ${attempt + 1}: Feature ${featureIndex} - API error ${featureResponse.status}`)
          continue
        }

        const feature: NeuronpediaFeature = await featureResponse.json()

        // Check for explanation
        const explanation = feature.explanations?.[0]
        if (!explanation?.description) {
          console.log(`  Attempt ${attempt + 1}: Feature ${featureIndex} - No explanation`)
          continue
        }

        // Quality check (skip if no score available)
        const explanationScore = explanation.scores?.[0]?.value ?? 1
        if (explanationScore < MIN_QUALITY) {
          console.log(`  Attempt ${attempt + 1}: Feature ${featureIndex} - Low quality ${explanationScore}`)
          continue
        }

        // Generate hints
        const hints = generateHints(feature.activations || [])
        if (hints.length < 2) {
          console.log(`  Attempt ${attempt + 1}: Feature ${featureIndex} - Not enough hints (${hints.length})`)
          continue
        }

        // Get UMAP coordinates
        const umapPoint = umapPoints.get(featureIndex)
        if (!umapPoint) {
          console.log(`  Attempt ${attempt + 1}: Feature ${featureIndex} - No UMAP coordinates`)
          continue
        }

        // Save puzzle
        const { error } = await supabase.from('puzzles').insert({
          date,
          round_number: roundNumber,
          model_id: saeConfig.modelId,
          layer: saeConfig.layer,
          feature_index: featureIndex,
          ground_truth_label: explanation.description,
          answer_x: umapPoint.x,
          answer_y: umapPoint.y,
          hints,
          explanation_score: explanationScore,
        })

        if (error) {
          console.error(`  Attempt ${attempt + 1}: Insert error:`, error.message)
          continue
        }

        // Mark feature as used
        usedFeatures.add(`${saeConfig.modelId}/${saeConfig.layer}/${featureIndex}`)
        successCount++
        generated = true

        console.log(`  ✓ Round ${roundNumber}: feature ${featureIndex} - "${explanation.description.slice(0, 50)}..."`)
        break
      } catch (err) {
        console.log(`  Attempt ${attempt + 1}: Feature ${featureIndex} - Error: ${err}`)
        continue
      }
    }

    if (!generated) {
      console.error(`  ✗ Failed to generate puzzle for round ${roundNumber} after 100 attempts`)
    }
  }

  // Update used features
  await supabase
    .from('used_features')
    .upsert({
      id: 1,
      feature_keys: Array.from(usedFeatures).slice(-100),
      updated_at: new Date().toISOString(),
    })

  console.log(`\nPuzzle generation complete! Generated ${successCount}/3 puzzles.`)
}

function generateHints(activations: { tokens: string[]; values: number[]; maxValue: number }[]) {
  const positive = activations.filter(a => a.maxValue > 0)
  positive.sort((a, b) => b.maxValue - a.maxValue)

  const seen = new Set<string>()
  const unique = positive.filter(a => {
    const key = a.tokens.join('').trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const selected = unique.slice(0, 10)
  selected.reverse()

  return selected.map((a, i) => ({
    id: `hint_${i + 1}`,
    text: a.tokens.join(''),
    score: a.maxValue,
    tokens: a.tokens.map((t, j) => ({ token: t, activation: a.values[j] ?? 0 })),
    level: i + 1,
  }))
}

generateDailyPuzzles().catch(console.error)
