'use client'

import { motion } from 'framer-motion'
import { formatScore, formatDistance, getScoreMessage } from '@/lib/services/scoring'

interface ScoreRevealProps {
  score: number
  distance: number
  groundTruth: string
  onContinue: () => void
  onExplore: () => void
}

export function ScoreReveal({ score, distance, groundTruth, onContinue, onExplore }: ScoreRevealProps) {
  const { message, emoji } = getScoreMessage(score)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-game-surface/95 backdrop-blur-sm rounded-xl p-6 text-center"
    >
      {/* Score display */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-4"
      >
        <span className="text-6xl">{emoji}</span>
        <h2 className="text-2xl font-bold mt-2">{message}</h2>
      </motion.div>

      {/* Score number */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-4"
      >
        <span className="text-5xl font-bold text-primary-400">
          {formatScore(score)}
        </span>
        <span className="text-gray-400 ml-2">points</span>
      </motion.div>

      {/* Distance */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-gray-400 mb-4"
      >
        {formatDistance(distance)} away
      </motion.p>

      {/* Ground truth */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-game-bg rounded-lg p-4 mb-6"
      >
        <p className="text-sm text-gray-400 mb-1">This feature represents:</p>
        <p className="text-lg font-medium text-white">{groundTruth}</p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center gap-3"
      >
        <button
          onClick={onExplore}
          className="px-6 py-3 rounded-lg font-semibold border border-white/15 text-gray-200 hover:bg-white/5 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
        >
          Explore the map
        </button>
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  )
}
