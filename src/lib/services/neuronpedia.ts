import type {
  SAEConfig,
  NeuronpediaFeature,
  ActivationResponse,
  UmapPoint,
  NeuronpediaActivation,
} from '@/types'
import { NEURONPEDIA, neuronpediaHeaders } from '@/config/saes'

const BASE_URL = NEURONPEDIA.baseUrl
const getHeaders = neuronpediaHeaders

/**
 * Test custom text activation for a specific feature
 */
export async function testActivation(
  config: SAEConfig,
  featureIndex: number,
  text: string
): Promise<ActivationResponse> {
  const response = await fetch(`${BASE_URL}/activation/new`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      feature: {
        modelId: config.modelId,
        source: config.layer,
        index: String(featureIndex),
      },
      customText: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Activation test failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get feature data including explanation and activations (for hints)
 */
export async function getFeature(
  config: SAEConfig,
  featureIndex: number
): Promise<NeuronpediaFeature> {
  const response = await fetch(
    `${BASE_URL}/feature/${config.modelId}/${config.layer}/${featureIndex}`,
    { headers: getHeaders() }
  )

  if (!response.ok) {
    throw new Error(`Failed to get feature: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get UMAP data for all features in a layer
 */
export async function getUmapData(config: SAEConfig): Promise<UmapPoint[]> {
  const response = await fetch(`${BASE_URL}/umap`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      modelId: config.modelId,
      layers: [config.layer],
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get UMAP data: ${response.statusText}`)
  }

  const data = await response.json()
  const layerData = data[config.layer] || []

  return layerData.map((point: {
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
}

export interface ProbeResult {
  index: number
  maxValue: number
  maxValueIndex: number
  values: number[]
}

export interface ProbeResponse {
  tokens: string[]
  results: ProbeResult[]
}

/**
 * Run text through the model and return the top activating features across
 * the whole SAE (Neuronpedia "search via inference"). numResults max is 100.
 */
export async function searchAllActivations(
  config: SAEConfig,
  text: string
): Promise<ProbeResponse> {
  const response = await fetch(`${BASE_URL}/search-all`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      modelId: config.modelId,
      // sourceSet is the layer id without its leading layer number,
      // e.g. "12-gemmascope-res-16k" -> "gemmascope-res-16k"
      sourceSet: config.layer.replace(/^\d+-/, ''),
      text,
      selectedLayers: [config.layer],
      sortIndexes: [],
      ignoreBos: true,
      densityThreshold: -1,
      numResults: 100,
    }),
  })

  if (!response.ok) {
    throw new Error(`Probe failed: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    tokens: data.tokens ?? [],
    results: (data.result ?? []).map((r: {
      index: string
      maxValue: number
      maxValueIndex: number
      values: number[]
    }) => ({
      index: parseInt(r.index, 10),
      maxValue: r.maxValue,
      maxValueIndex: r.maxValueIndex,
      values: r.values,
    })),
  }
}

/**
 * Export all explanations for a layer (for database sync)
 */
export async function exportExplanations(config: SAEConfig): Promise<{
  modelId: string
  layer: string
  index: string
  description: string
  explanationModelName?: string
  typeName?: string
}[]> {
  const response = await fetch(
    `${BASE_URL}/explanation/export?modelId=${config.modelId}&saeId=${config.layer}`,
    { headers: getHeaders() }
  )

  if (!response.ok) {
    throw new Error(`Failed to export explanations: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Filter out BOS token from activation response
 */
export function filterBosToken(response: ActivationResponse): ActivationResponse {
  const bosIndex = response.tokens.findIndex(t => t === '<bos>')

  if (bosIndex === -1) {
    return response
  }

  return {
    ...response,
    tokens: response.tokens.filter((_, i) => i !== bosIndex),
    values: response.values.filter((_, i) => i !== bosIndex),
  }
}
