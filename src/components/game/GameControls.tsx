'use client'

import { useGameStore, selectCurrentRound, selectRevealedHints } from '@/lib/store/gameStore'
import { TestInput } from './TestInput'
import { HintPanel } from './HintPanel'
import { formatScore } from '@/lib/services/scoring'

interface GameControlsProps {
  onProbeResults: (results: { index: number; maxValue: number }[]) => void
}

export function GameControls({ onProbeResults }: GameControlsProps) {
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
    <div className="game-overlay fixed left-4 top-20 2xl:top-24 min-[1920px]:top-28 bottom-4 flex items-center z-30 pointer-events-none">
    <aside className="w-80 2xl:w-[28rem] min-[1920px]:w-[32rem] max-w-[calc(100vw-2rem)] max-h-full flex flex-col bg-game-surface/70 backdrop-blur-md rounded-2xl border border-white/15 shadow-2xl overflow-hidden pointer-events-auto">
      {/* HUD: Round + Score on one line */}
      <div className="shrink-0 px-5 2xl:px-6 py-4 2xl:py-6 border-b border-white/10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] 2xl:text-xs uppercase tracking-widest text-gray-200 mb-1">Round</p>
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
                  className={`w-7 h-7 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center text-sm 2xl:text-base font-bold tabular-nums ${cls}`}
                >
                  {i + 1}
                </div>
              )
            })}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] 2xl:text-xs uppercase tracking-widest text-gray-200 mb-1">Score</p>
          <p className="text-2xl 2xl:text-3xl font-bold text-primary-400 tabular-nums">
            {formatScore(totalScore)}
          </p>
        </div>
      </div>

      {/* Hints — fixed height, hint cards scroll internally */}
      <div className="shrink-0 px-5 2xl:px-6 py-4 border-b border-white/10">
        <HintPanel
          hints={revealedHints}
          totalHints={totalHints}
          onRevealHint={revealHint}
          hintsRevealed={hintsRevealed}
        />
      </div>

      {/* Test input */}
      <div className="shrink-0 px-5 2xl:px-6 py-4 border-b border-white/10 space-y-3">
        <p className="text-[10px] 2xl:text-xs uppercase tracking-widest text-gray-200">Test your theory</p>
        <TestInput onProbeResults={onProbeResults} />
      </div>

      {/* Lock-in button */}
      <div className="shrink-0 px-5 2xl:px-6 py-4 2xl:py-5">
        <button
          data-onboarding="lock-in-button"
          onClick={lockIn}
          disabled={!canLockIn}
          className={`w-full py-2.5 2xl:py-3.5 rounded-xl text-sm 2xl:text-lg font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight
            ${canLockIn
              ? 'bg-game-highlight hover:bg-red-600 text-white shadow-[0_0_20px_rgba(233,69,96,0.4)]'
              : 'border border-gray-600 text-gray-500 cursor-not-allowed'
            }`}
        >
          Lock In Answer
        </button>
      </div>
    </aside>
    </div>
  )
}
