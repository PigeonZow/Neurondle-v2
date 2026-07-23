'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, selectCurrentRound } from '@/lib/store/gameStore'

// Bottom-center slot over the map: an instruction chip until a pin exists,
// then the lock-in button. Living on the map (not in the info panel) ties
// the commit action to where guessing actually happens.
export function LockInBar() {
  const currentRound = useGameStore(selectCurrentRound)
  const lockIn = useGameStore(state => state.lockIn)

  if (!currentRound) return null
  const { phase, pin, confirmed } = currentRound
  if (confirmed || phase === 'reveal' || phase === 'complete') return null

  return (
    <div
      data-onboarding="lock-in-button"
      className="game-overlay fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
    >
      <AnimatePresence mode="wait" initial={false}>
        {pin ? (
          <motion.button
            key="lock"
            initial={{ y: 12, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={lockIn}
            className="pointer-events-auto px-8 2xl:px-10 py-2.5 2xl:py-3 bg-alert hover:bg-alert/90 text-starlight rounded text-sm 2xl:text-lg font-bold tracking-wide shadow-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Lock In Answer
          </motion.button>
        ) : (
          <motion.div
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-2 bg-chart/90 border border-graticule/40 rounded-full font-mono text-xs 2xl:text-sm text-starlight/60 shadow-lg whitespace-nowrap select-none"
          >
            Click the map to drop your pin
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
