import type { Point, ScoreMessage, SCORE_MESSAGES } from '@/types'

/**
 * Calculate Euclidean distance between two points
 */
export function calculateDistance(pin: Point, answer: Point): number {
  return Math.sqrt(
    Math.pow(pin.x - answer.x, 2) + Math.pow(pin.y - answer.y, 2)
  )
}

/**
 * Calculate score based on distance using exponential decay
 * - Distance < 0.5: Perfect score (10,000)
 * - Otherwise: Exponential decay with factor 0.3
 */
export function calculateScore(distance: number): number {
  if (distance < 0.5) return 10000
  return Math.max(0, Math.floor(10000 * Math.exp(-0.3 * distance)))
}

/**
 * Get score message and emoji based on score value
 */
export function getScoreMessage(score: number): ScoreMessage {
  if (score >= 9800) return { message: 'Direct hit', emoji: '🎯' }
  if (score >= 7000) return { message: 'Near miss', emoji: '🔥' }
  // if (score >= 6000) return { message: 'Close', emoji: '⭐' }
  if (score >= 4500) return { message: 'Close', emoji: '👍' }
  if (score >= 2000) return { message: 'Far', emoji: '🙂' }
  return { message: 'Way off', emoji: '🔍' }
}

/**
 * Format score for display with thousands separator
 */
export function formatScore(score: number): string {
  return score.toLocaleString()
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number): string {
  return distance.toFixed(2)
}
