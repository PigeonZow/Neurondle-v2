// === Puzzle & Game State ===

export interface Puzzle {
  id: string
  featureIndex: number
  modelId: string
  layer: string
  date: string // YYYY-MM-DD
  roundNumber: number // 1, 2, or 3
  groundTruthLabel: string
  hints: Hint[]
  answerX: number // UMAP coordinate
  answerY: number
}

export interface Hint {
  id: string
  text: string
  score: number // Max activation value
  tokens: TokenActivation[]
  level: number // 1 = weakest, 10 = strongest
}

export interface TokenActivation {
  token: string
  activation: number
}

export interface GameState {
  puzzles: Puzzle[] // 3 puzzles for today
  currentRound: number // 0, 1, or 2 (0-indexed)
  rounds: RoundState[]
  totalScore: number
}

export interface RoundState {
  puzzle: Puzzle
  phase: 'explore' | 'guess' | 'reveal' | 'complete'
  pin: Point | null
  confirmed: boolean
  score: number | null
  distance: number | null
  hintsRevealed: number
  activationTests: ActivationTest[]
}

export interface Point {
  x: number
  y: number
}

// === Activation Testing ===

export interface ActivationTest {
  id: string
  text: string
  maxScore: number
  tokens: TokenActivation[]
  timestamp: Date
}

export interface ActivationResponse {
  tokens: string[]
  values: number[]
  maxValue: number
  modelId: string
  layer: string
  index: string
}

// === UMAP Data ===

export interface UmapPoint {
  index: number
  description: string
  x: number
  y: number
  sparsity?: number // For coloring
}

// === SAE Configuration ===

export interface SAEConfig {
  id: string // e.g., "gemma_res_12_16k"
  modelId: string // e.g., "gemma-2-2b"
  layer: string // e.g., "12-gemmascope-res-16k"
  maxFeatures: number // e.g., 16384
  displayName: string
  enabled: boolean // false = known but not usable for live play
}

// SAE definitions live in src/config/saes.ts (single source of truth).
// Import { SAES, activeSae, findSae, ... } from '@/config/saes'.

// === Session ===

export interface Session {
  id: string
  sessionToken: string
  date: string
  currentRound: number
  totalScore: number
  completed: boolean
  researchConsent: boolean
}

// === Neuronpedia API Types ===

export interface NeuronpediaFeature {
  modelId: string
  layer: string
  index: string
  maxActApprox?: number
  explanations?: NeuronpediaExplanation[]
  activations?: NeuronpediaActivation[]
}

export interface NeuronpediaExplanation {
  id: string
  description: string
  scores?: { value: number }[]
}

export interface NeuronpediaActivation {
  id: string
  tokens: string[]
  values: number[]
  maxValue: number
  binMin?: number
  binMax?: number
}

// === Score Messages ===

export interface ScoreMessage {
  message: string
  emoji: string
}

export const SCORE_MESSAGES: { threshold: number; message: string; emoji: string }[] = [
  { threshold: 9500, message: 'Perfect!', emoji: '🎯' },
  { threshold: 7000, message: 'Excellent!', emoji: '🔥' },
  { threshold: 5000, message: 'Great!', emoji: '⭐' },
  { threshold: 3000, message: 'Good!', emoji: '👍' },
  { threshold: 1000, message: 'Nice try!', emoji: '🙂' },
  { threshold: 0, message: 'Keep exploring!', emoji: '🔍' },
]
