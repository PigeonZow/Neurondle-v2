import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'
import { allSaes, NEURONPEDIA, neuronpediaHeaders } from '../src/config/saes'

async function syncExplanations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const headers = neuronpediaHeaders()

  for (const config of allSaes()) {
    console.log(`Syncing ${config.modelId}/${config.layer}...`)

    // Download from Neuronpedia
    const response = await fetch(
      `${NEURONPEDIA.baseUrl}/explanation/export?modelId=${config.modelId}&saeId=${config.layer}`,
      { headers }
    )

    if (!response.ok) {
      console.error(`Failed to fetch explanations for ${config.layer}: ${response.statusText}`)
      continue
    }

    const explanations = await response.json()
    console.log(`Downloaded ${explanations.length} explanations`)

    // Batch upsert (1000 at a time)
    const batchSize = 1000
    for (let i = 0; i < explanations.length; i += batchSize) {
      const batch = explanations.slice(i, i + batchSize).map((exp: {
        modelId: string
        layer: string
        index: string
        description: string
        explanationModelName?: string
        typeName?: string
      }) => ({
        model_id: exp.modelId,
        layer: exp.layer,
        feature_index: parseInt(exp.index),
        description: exp.description,
        explanation_model_name: exp.explanationModelName,
        type_name: exp.typeName,
        synced_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('explanations')
        .upsert(batch, { onConflict: 'model_id,layer,feature_index' })

      if (error) {
        console.error(`Batch insert error:`, error)
      }

      console.log(`  ${Math.min(i + batchSize, explanations.length)}/${explanations.length}`)
    }
  }

  console.log('Sync complete!')
}

syncExplanations().catch(console.error)
