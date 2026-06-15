/**
 * Single source of truth for SAE / Neuronpedia configuration.
 *
 * To switch which SAE the game uses:
 *   1. Make sure it has an entry in SAES below (add one if needed).
 *   2. Set NEURONDLE_SAE=<key> in your env (or change DEFAULT_SAE_ID).
 *   3. Re-run the offline pipeline so the data matches:
 *        npm run cache-umap        (caches the map for that SAE)
 *        npm run sync-explanations (optional)
 *        npm run generate-puzzles  (builds puzzles from the active SAE)
 *
 * See docs/CONFIG.md for the full walkthrough.
 *
 * NOTE: env-derived values are read lazily (via functions / getters) so that
 * CLI scripts which load dotenv at runtime still pick them up — reading them at
 * module-eval time would happen before dotenv runs.
 */
import type { SAEConfig } from '@/types'

/** Neuronpedia connection settings (was hardcoded in ~5 places). */
export const NEURONPEDIA = {
  get baseUrl(): string {
    return process.env.NEURONPEDIA_BASE_URL ?? 'https://www.neuronpedia.org/api'
  },
  get apiKey(): string | undefined {
    return process.env.NEURONPEDIA_API_KEY
  },
}

/** Standard headers for Neuronpedia requests (adds the API key when present). */
export function neuronpediaHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (NEURONPEDIA.apiKey) headers['X-API-Key'] = NEURONPEDIA.apiKey
  return headers
}

/**
 * Every SAE Neurondle knows about. Add an entry here to make a new SAE
 * available, then point NEURONDLE_SAE at its key.
 *
 * `enabled: false` = known but not usable for live play yet. The 65K layers
 * currently return 0 UMAP points from Neuronpedia, so they can't back a game.
 */
export const SAES = {
  gemma_res_12_16k: {
    id: 'gemma_res_12_16k',
    modelId: 'gemma-2-2b',
    layer: '12-gemmascope-res-16k',
    maxFeatures: 16384,
    displayName: 'Gemma 2 2B · Layer 12 (16K)',
    enabled: true,
  },
  gemma_res_25_65k: {
    id: 'gemma_res_25_65k',
    modelId: 'gemma-2-2b',
    layer: '25-gemmascope-res-65k',
    maxFeatures: 65536,
    displayName: 'Gemma 2 2B · Layer 25 (65K)',
    enabled: false, // Neuronpedia returns 0 UMAP points for this layer
  },
  gemma_mlp_15_65k: {
    id: 'gemma_mlp_15_65k',
    modelId: 'gemma-2-2b',
    layer: '15-gemmascope-mlp-65k',
    maxFeatures: 65536,
    displayName: 'Gemma 2 2B · Layer 15 MLP (65K)',
    enabled: false, // Neuronpedia returns 0 UMAP points for this layer
  },
} satisfies Record<string, SAEConfig>

export type SaeId = keyof typeof SAES

/** Fallback when NEURONDLE_SAE is not set. */
export const DEFAULT_SAE_ID: SaeId = 'gemma_res_12_16k'

/** The SAE id selected for this deployment (env override → default). */
export function activeSaeId(): SaeId {
  return (process.env.NEURONDLE_SAE as SaeId) || DEFAULT_SAE_ID
}

/** All SAEs (including disabled ones). */
export function allSaes(): SAEConfig[] {
  return Object.values(SAES)
}

/** SAEs usable for live play. */
export function enabledSaes(): SAEConfig[] {
  return allSaes().filter((s) => s.enabled)
}

/**
 * The active SAE used by puzzle generation and the live map. Throws loudly if
 * NEURONDLE_SAE points at something unknown (better than silently defaulting).
 */
export function activeSae(): SAEConfig {
  const id = activeSaeId()
  const sae = SAES[id]
  if (!sae) {
    throw new Error(
      `NEURONDLE_SAE="${id}" is not a known SAE. Known: ${Object.keys(SAES).join(', ')}`
    )
  }
  if (!sae.enabled) {
    console.warn(
      `[neurondle] Active SAE "${id}" is marked enabled:false — it may have no UMAP data.`
    )
  }
  return sae
}

/** Look up an SAE by model + layer (used to validate activation requests). */
export function findSae(modelId: string, layer: string): SAEConfig | undefined {
  return allSaes().find((s) => s.modelId === modelId && s.layer === layer)
}
