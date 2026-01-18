'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, selectCurrentRound, selectRevealedHints } from '@/lib/store/gameStore'
import { TestInput } from './TestInput'
import { HintPanel } from './HintPanel'
import { ScoreReveal } from './ScoreReveal'
import { FeatureSearch } from './FeatureSearch'
import type { UmapPoint } from '@/types'

interface GameControlsProps {
  umapData: UmapPoint[]
  onFilterChange: (query: string) => void
  onJumpToPoint: (point: UmapPoint) => void
}

export function GameControls({ umapData, onFilterChange, onJumpToPoint }: GameControlsProps) {
  const [expanded, setExpanded] = useState(true)

  const currentRound = useGameStore(selectCurrentRound)
  const revealedHints = useGameStore(selectRevealedHints)
  const lockIn = useGameStore(state => state.lockIn)
  const revealHint = useGameStore(state => state.revealHint)
  const nextRound = useGameStore(state => state.nextRound)

  if (!currentRound) return null

  const { phase, pin, puzzle, hintsRevealed } = currentRound
  const canLockIn = pin && !currentRound.confirmed
  const totalHints = puzzle.hints.length

  return (
    <div className="game-overlay fixed bottom-0 left-0 right-0 p-4 pointer-events-none">
      <div className="max-w-2xl mx-auto space-y-3 pointer-events-auto">
        {/* Score reveal overlay */}
        <AnimatePresence>
          {phase === 'reveal' && currentRound.score !== null && (
            <ScoreReveal
              score={currentRound.score}
              distance={currentRound.distance!}
              groundTruth={puzzle.groundTruthLabel}
              onContinue={nextRound}
            />
          )}
        </AnimatePresence>

        {/* Controls panel */}
        {phase !== 'reveal' && phase !== 'complete' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-game-surface/90 backdrop-blur-sm rounded-xl p-3 space-y-3"
          >
            {/* Expandable content */}
            {expanded && (
              <div className="space-y-3">
                {/* Feature Search */}
                <FeatureSearch
                  data={umapData}
                  onFilterChange={onFilterChange}
                  onJumpToPoint={onJumpToPoint}
                />

                {/* Hint panel */}
                <HintPanel
                  hints={revealedHints}
                  totalHints={totalHints}
                  onRevealHint={revealHint}
                  hintsRevealed={hintsRevealed}
                />
              </div>
            )}

            {/* Test input */}
            <TestInput />

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {expanded ? 'Collapse' : 'Expand'}
              </button>

              <button
                onClick={lockIn}
                disabled={!canLockIn}
                className={`
                  px-5 py-2 rounded-lg text-sm font-semibold transition-all
                  ${canLockIn
                    ? 'bg-game-highlight hover:bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                Lock In
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
