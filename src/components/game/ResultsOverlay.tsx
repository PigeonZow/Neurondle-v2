'use client'

import { motion } from 'framer-motion'
import { useGameStore } from '@/lib/store/gameStore'
import { formatScore, getScoreMessage } from '@/lib/services/scoring'

export function ResultsOverlay() {
  const rounds = useGameStore(state => state.rounds)
  const totalScore = useGameStore(state => state.totalScore)

  const { message, emoji } = getScoreMessage(totalScore / 3) // Average per round

  const handleShare = () => {
    const date = new Date().toISOString().split('T')[0]
    const scoreBlocks = rounds.map(r => {
      if (r.score === null) return '⬛'
      if (r.score >= 9500) return '🟩'
      if (r.score >= 7000) return '🟨'
      if (r.score >= 3000) return '🟧'
      return '🟥'
    }).join('')

    const text = `Neurondle ${date}\n${scoreBlocks} ${formatScore(totalScore)}/30,000\n\nPlay at: neurondle.com`

    if (navigator.share) {
      navigator.share({ text })
    } else {
      navigator.clipboard.writeText(text)
      alert('Results copied to clipboard!')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-game-surface rounded-2xl p-8 max-w-md w-full text-center"
      >
        <span className="text-6xl">{emoji}</span>
        <h1 className="text-3xl font-bold mt-4 mb-2">{message}</h1>
        <p className="text-gray-400 mb-6">You completed today&apos;s Neurondle!</p>

        {/* Total score */}
        <div className="bg-game-bg rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-400 mb-1">Total Score</p>
          <p className="text-4xl font-bold text-primary-400">
            {formatScore(totalScore)}
            <span className="text-lg text-gray-400">/30,000</span>
          </p>
        </div>

        {/* Round breakdown */}
        <div className="space-y-2 mb-6">
          {rounds.map((round, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-game-bg rounded-lg px-4 py-2"
            >
              <span className="text-gray-400">Round {i + 1}</span>
              <span className="font-mono text-primary-400">
                {round.score !== null ? formatScore(round.score) : '-'}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
          >
            Share Results
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-3 bg-game-bg hover:bg-gray-800 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
          >
            Play Again
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Come back tomorrow for new puzzles!
        </p>
      </motion.div>
    </motion.div>
  )
}
