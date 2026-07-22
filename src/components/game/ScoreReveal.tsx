'use client'

import { motion } from 'framer-motion'
import { CornerTicks } from '@/components/ui/CornerTicks'
import { useFieldGuideStore } from '@/lib/store/fieldGuideStore'
import { formatScore, formatDistance, getScoreMessage } from '@/lib/services/scoring'

interface ScoreRevealProps {
  score: number
  distance: number
  groundTruth: string
  onContinue: () => void
}

export function ScoreReveal({ score, distance, groundTruth, onContinue }: ScoreRevealProps) {
  const { message } = getScoreMessage(score)
  const openGuide = useFieldGuideStore(state => state.openGuide)

  return (
    <div className="relative bg-chart/95 rounded-sm border border-graticule/35 shadow-2xl p-5 2xl:p-6 text-center">
      <CornerTicks />
      {/* Verdict */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-4"
      >
        <h2 className="text-xl 2xl:text-2xl font-bold text-starlight">
          {message}
        </h2>
      </motion.div>

      {/* Score number */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-4"
      >
        <span className="font-mono text-4xl 2xl:text-5xl font-semibold text-accent tabular-nums">
          {formatScore(score)}
        </span>
        <span className="text-starlight/50 ml-2">points</span>
      </motion.div>

      {/* Distance */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="font-mono text-sm text-starlight/60 mb-4"
      >
        {formatDistance(distance)} away
      </motion.p>

      {/* Ground truth — still just the auto-labeler's claim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-ink/60 border border-graticule/25 rounded p-4 mb-6 text-left"
      >
        <p className="font-mono text-xs text-starlight/45 mb-1">auto-label:</p>
        <p className="text-base 2xl:text-lg font-medium text-starlight">{groundTruth}</p>
        <button
          onClick={() => openGuide('why-neurondle')}
          className="mt-2 text-xs text-starlight/50 hover:text-accent underline decoration-dotted underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
        >
          How was this label made?
        </button>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onContinue}
        className="w-full py-3 bg-accent-deep hover:bg-accent-deep/90 text-starlight rounded font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        Continue
      </motion.button>
    </div>
  )
}
