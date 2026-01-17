import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SAE_CONFIGS = [
  { id: 'gemma_res_12_16k', modelId: 'gemma-2-2b', layer: '12-gemmascope-res-16k' },
  { id: 'gemma_res_25_65k', modelId: 'gemma-2-2b', layer: '25-gemmascope-res-65k' },
  { id: 'gemma_mlp_15_65k', modelId: 'gemma-2-2b', layer: '15-gemmascope-mlp-65k' },
]

async function cacheUmapData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Create cache directory
  const cacheDir = path.join(process.cwd(), 'public', 'umap-cache')
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }

  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (process.env.NEURONPEDIA_API_KEY) {
    headers['X-API-Key'] = process.env.NEURONPEDIA_API_KEY
  }

  for (const config of SAE_CONFIGS) {
    console.log(`Caching UMAP data for ${config.layer}...`)

    const response = await fetch('https://www.neuronpedia.org/api/umap', {
      method: 'POST',
      headers,
      body: JSON.stringify({ modelId: config.modelId, layers: [config.layer] }),
    })

    if (!response.ok) {
      console.error(`Failed to fetch UMAP data for ${config.layer}: ${response.statusText}`)
      continue
    }

    const data = await response.json()
    const layerData = data[config.layer] || []

    console.log(`  Downloaded ${layerData.length} points`)

    // Transform to our format
    const umapPoints = layerData.map((point: {
      index: number
      description?: string
      umap_x: number
      umap_y: number
      umap_log_feature_sparsity?: number
    }) => ({
      index: point.index,
      description: point.description || '',
      x: point.umap_x,
      y: point.umap_y,
      sparsity: point.umap_log_feature_sparsity,
    }))

    // Save to local file
    const filename = `${config.id}.json`
    const filepath = path.join(cacheDir, filename)
    fs.writeFileSync(filepath, JSON.stringify(umapPoints))
    console.log(`  Saved to ${filepath}`)

    // Optionally upload to Supabase storage
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { error } = await supabase.storage
        .from('umap-cache')
        .upload(`${config.modelId}/${config.layer}.json`, JSON.stringify(umapPoints), {
          contentType: 'application/json',
          upsert: true,
        })

      if (error) {
        console.log(`  Supabase upload skipped (bucket may not exist): ${error.message}`)
      } else {
        console.log(`  Uploaded to Supabase storage`)
      }
    }
  }

  console.log('\nUMAP caching complete!')
}

cacheUmapData().catch(console.error)
