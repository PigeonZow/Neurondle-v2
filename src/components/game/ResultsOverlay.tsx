'use client'

import { motion } from 'framer-motion'
import { useGameStore } from '@/lib/store/gameStore'
import { CornerTicks } from '@/components/ui/CornerTicks'
import { formatScore, getScoreMessage } from '@/lib/services/scoring'

export function ResultsOverlay() {
  const rounds = useGameStore(state => state.rounds)
  const totalScore = useGameStore(state => state.totalScore)

  const { message } = getScoreMessage(totalScore / 3) // Average per round

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
      className="fixed inset-0 bg-ink/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative bg-chart rounded-sm border border-graticule/35 p-8 max-w-md w-full text-center"
      >
        <CornerTicks />
        <h1 className="text-2xl 2xl:text-3xl font-bold mb-2 text-starlight">
          {message}
        </h1>
        <p className="text-starlight/50 mb-6">You completed today&apos;s Neurondle</p>

        {/* Total score */}
        <div className="bg-ink/60 border border-graticule/25 rounded p-6 mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-starlight/45 mb-1.5">Total Score</p>
          <p className="font-mono text-4xl font-semibold text-accent tabular-nums">
            {formatScore(totalScore)}
            <span className="text-lg text-starlight/50">/30,000</span>
          </p>
        </div>

        {/* Round breakdown */}
        <div className="space-y-2 mb-6">
          {rounds.map((round, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-ink/60 border border-graticule/25 rounded px-4 py-2"
            >
              <span className="text-starlight/60">Round {i + 1}</span>
              <span className="font-mono text-accent tabular-nums">
                {round.score !== null ? formatScore(round.score) : '-'}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 px-4 py-3 bg-accent-deep hover:bg-accent-deep/90 text-starlight rounded font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Share Results
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-3 border border-graticule/50 text-starlight/80 hover:text-starlight hover:bg-starlight/5 rounded font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Play Again
          </button>
        </div>

        <p className="text-xs text-starlight/40 mt-4">
          Come back tomorrow for new puzzles
        </p>
      </motion.div>
    </motion.div>
  )
}
