import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { SAE_CONFIGS } from '@/types'

export interface ClusterBoundary {
  clusterId: number
  color: string
  pointCount: number
  polygon: [number, number][]
}

// Cache cluster data in memory
let cachedClusterData: ClusterBoundary[] | null = null

export async function GET() {
  try {
    // Return cached data if available
    if (cachedClusterData) {
      return NextResponse.json(cachedClusterData)
    }

    const config = SAE_CONFIGS[0]

    // Load from cached file
    try {
      const cachePath = path.join(process.cwd(), 'public', 'umap-cache', `${config.id}_clusters.json`)
      const fileData = await fs.readFile(cachePath, 'utf-8')
      const clusterData: ClusterBoundary[] = JSON.parse(fileData)

      if (clusterData.length > 0) {
        cachedClusterData = clusterData
        console.log(`Loaded ${clusterData.length} cluster boundaries from cache`)
        return NextResponse.json(clusterData)
      }
    } catch (fileError) {
      console.log('No cached cluster file found')
    }

    // Return empty array if no clusters available
    return NextResponse.json([])
  } catch (error) {
    console.error('Cluster fetch error:', error)
    return NextResponse.json([])
  }
}
