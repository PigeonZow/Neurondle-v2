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
    <div className="game-overlay fixed bottom-0 left-0 right-0 px-4 pt-16 pb-4 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
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
          <div className="relative">
            {/* Collapse tab - folder style */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 bg-game-surface hover:bg-[#1c2b52] rounded-t-lg text-gray-400 hover:text-white transition-all border-t border-x border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
            >
              <span className="text-xs font-medium">{expanded ? 'Hide' : 'Controls'}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : 'rotate-180'}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-game-surface rounded-xl p-3 space-y-3 border border-white/15 shadow-2xl"
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

                  <div className="border-t border-white/10" />

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
              <div className="space-y-2 pt-1 border-t border-white/10 mt-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Test your theory</p>
                <TestInput />
              </div>

              {/* Guess button */}
              <div className="flex justify-end pt-2 border-t border-white/10">
                <button
                  data-onboarding="lock-in-button"
                  onClick={lockIn}
                  disabled={!canLockIn}
                  className={`
                    px-5 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight
                    ${canLockIn
                      ? 'bg-game-highlight hover:bg-red-600 text-white'
                      : 'border border-gray-600 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  Guess
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
