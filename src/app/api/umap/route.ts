import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getUmapData } from '@/lib/services/neuronpedia'
import { SAE_CONFIGS } from '@/types'
import type { UmapPoint } from '@/types'

// Cache UMAP data in memory (it's static)
let cachedUmapData: UmapPoint[] | null = null

export async function GET() {
  try {
    // Return cached data if available
    if (cachedUmapData && cachedUmapData.length > 0) {
      return NextResponse.json(cachedUmapData)
    }

    const config = SAE_CONFIGS[0]

    // Try to load from cached file first
    try {
      const cachePath = path.join(process.cwd(), 'public', 'umap-cache', `${config.id}.json`)
      const fileData = await fs.readFile(cachePath, 'utf-8')
      const umapData: UmapPoint[] = JSON.parse(fileData)

      if (umapData.length > 0) {
        cachedUmapData = umapData
        console.log(`Loaded ${umapData.length} UMAP points from cache`)
        return NextResponse.json(umapData)
      }
    } catch (fileError) {
      console.log('No cached UMAP file found, fetching from API...')
    }

    // Fall back to Neuronpedia API
    try {
      const umapData = await getUmapData(config)
      if (umapData.length > 0) {
        cachedUmapData = umapData
        return NextResponse.json(umapData)
      }
    } catch (apiError) {
      console.error('Neuronpedia API error:', apiError)
    }

    // Last resort: mock data
    console.log('Using mock UMAP data')
    return NextResponse.json(generateMockUmapData())
  } catch (error) {
    console.error('UMAP fetch error:', error)
    return NextResponse.json(generateMockUmapData())
  }
}

// Generate mock UMAP data for development
function generateMockUmapData(): UmapPoint[] {
  const points: UmapPoint[] = []
  const numPoints = 1000

  for (let i = 0; i < numPoints; i++) {
    const cluster = Math.floor(Math.random() * 8)
    const clusterCenters = [
      { x: -5, y: 3 },
      { x: 3, y: 4 },
      { x: -3, y: -4 },
      { x: 5, y: -2 },
      { x: 0, y: 0 },
      { x: -6, y: -1 },
      { x: 6, y: 2 },
      { x: 1, y: -5 },
    ]

    const center = clusterCenters[cluster]
    const spread = 1.5

    points.push({
      index: i,
      description: `Feature ${i}`,
      x: center.x + (Math.random() - 0.5) * spread * 2,
      y: center.y + (Math.random() - 0.5) * spread * 2,
      sparsity: -3 + Math.random() * 3,
    })
  }

  return points
}
