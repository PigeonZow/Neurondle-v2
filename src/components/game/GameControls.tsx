'use client'

import { useGameStore, selectCurrentRound, selectRevealedHints } from '@/lib/store/gameStore'
import { TestInput } from './TestInput'
import { HintPanel } from './HintPanel'
import { formatScore } from '@/lib/services/scoring'

export function GameControls() {
  const currentRound = useGameStore(selectCurrentRound)
  const revealedHints = useGameStore(selectRevealedHints)
  const lockIn = useGameStore(state => state.lockIn)
  const revealHint = useGameStore(state => state.revealHint)
  const currentRoundIndex = useGameStore(state => state.currentRound)
  const totalScore = useGameStore(state => state.totalScore)
  const rounds = useGameStore(state => state.rounds)

  if (!currentRound) return null

  const { phase, pin, puzzle, hintsRevealed } = currentRound
  const canLockIn = pin && !currentRound.confirmed
  const totalHints = puzzle.hints.length
  const totalRounds = rounds.length || 3

  if (phase === 'complete') return null

  return (
    <aside className="game-overlay fixed left-4 top-1/2 -translate-y-1/2 w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-10rem)] z-30 flex flex-col bg-game-surface/70 backdrop-blur-md rounded-2xl border border-white/15 shadow-2xl overflow-hidden pointer-events-auto">
      {/* HUD: Round + Score on one line */}
      <div className="shrink-0 px-5 py-5 border-b border-white/10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-200 mb-1">Round</p>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalRounds }).map((_, i) => {
              const isPast = i < currentRoundIndex
              const isCurrent = i === currentRoundIndex
              const cls = isPast
                ? 'bg-primary-400 text-white'
                : isCurrent
                  ? 'border-2 border-primary-400 text-white bg-primary-400/10'
                  : 'bg-white/10 text-gray-500'
              return (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold tabular-nums ${cls}`}
                >
                  {i + 1}
                </div>
              )
            })}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-gray-200 mb-1">Score</p>
          <p className="text-2xl font-bold text-primary-400 tabular-nums">
            {formatScore(totalScore)}
          </p>
        </div>
      </div>

      {/* Hints — fixed height, hint cards scroll internally */}
      <div className="shrink-0 px-5 py-5 border-b border-white/10">
        <HintPanel
          hints={revealedHints}
          totalHints={totalHints}
          onRevealHint={revealHint}
          hintsRevealed={hintsRevealed}
        />
      </div>

      {/* Test input */}
      <div className="shrink-0 px-5 py-5 border-b border-white/10 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-gray-200">Test your theory</p>
        <TestInput />
      </div>

      {/* Lock-in button */}
      <div className="shrink-0 px-5 py-5">
        <button
          data-onboarding="lock-in-button"
          onClick={lockIn}
          disabled={!canLockIn}
          className={`w-full py-3 rounded-xl text-base font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight
            ${canLockIn
              ? 'bg-game-highlight hover:bg-red-600 text-white shadow-[0_0_20px_rgba(233,69,96,0.4)]'
              : 'border border-gray-600 text-gray-500 cursor-not-allowed'
            }`}
        >
          Lock In Answer
        </button>
      </div>
    </aside>
  )
}
