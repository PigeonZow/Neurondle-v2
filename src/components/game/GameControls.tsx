'use client'

import { useGameStore, selectCurrentRound, selectRevealedHints } from '@/lib/store/gameStore'
import { TestInput } from './TestInput'
import { HintPanel } from './HintPanel'
import { CornerTicks } from '@/components/ui/CornerTicks'
import { formatScore } from '@/lib/services/scoring'

interface GameControlsProps {
  onProbeResults: (results: { index: number; maxValue: number }[], text: string) => void
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
    <aside className="relative w-80 2xl:w-[28rem] min-[1920px]:w-[32rem] max-w-[calc(100vw-2rem)] max-h-full flex flex-col bg-chart/90 rounded-sm border border-graticule/35 shadow-2xl overflow-hidden pointer-events-auto">
      <CornerTicks />
      {/* HUD: Round + Score on one line */}
      <div className="shrink-0 px-5 2xl:px-6 py-4 2xl:py-6 border-b border-graticule/25 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] 2xl:text-xs uppercase tracking-[0.18em] text-starlight/45 mb-1.5">Round</p>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalRounds }).map((_, i) => {
              const isPast = i < currentRoundIndex
              const isCurrent = i === currentRoundIndex
              const cls = isPast
                ? 'bg-accent text-ink'
                : isCurrent
                  ? 'border-2 border-accent text-starlight bg-accent/10'
                  : 'border border-graticule/50 text-starlight/40'
              return (
                <div
                  key={i}
                  className={`w-7 h-7 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center font-mono text-sm 2xl:text-base font-semibold tabular-nums ${cls}`}
                >
                  {i + 1}
                </div>
              )
            })}
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] 2xl:text-xs uppercase tracking-[0.18em] text-starlight/45 mb-1.5">Score</p>
          <p className="font-mono text-2xl 2xl:text-3xl font-semibold text-accent tabular-nums">
            {formatScore(totalScore)}
          </p>
        </div>
      </div>

      {/* Scrollable middle: hints + test. The HUD above and Lock In below are
          pinned, so the primary action can never be pushed out of view. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-5 2xl:px-6 py-4 border-b border-graticule/25">
          <HintPanel
            hints={revealedHints}
            totalHints={totalHints}
            onRevealHint={revealHint}
            hintsRevealed={hintsRevealed}
          />
        </div>

        <div className="px-5 2xl:px-6 py-4 space-y-3">
          <p className="font-mono text-[10px] 2xl:text-xs uppercase tracking-[0.18em] text-starlight/45">Probe</p>
          <TestInput onProbeResults={onProbeResults} />
        </div>
      </div>

      {/* Lock-in button — pinned footer */}
      <div className="shrink-0 px-5 2xl:px-6 py-4 2xl:py-5 border-t border-graticule/25">
        <button
          data-onboarding="lock-in-button"
          onClick={lockIn}
          disabled={!canLockIn}
          className={`w-full py-2.5 2xl:py-3.5 rounded text-sm 2xl:text-lg font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60
            ${canLockIn
              ? 'bg-alert hover:bg-alert/90 text-starlight'
              : 'border border-graticule/50 text-starlight/30 cursor-not-allowed'
            }`}
        >
          Lock In Answer
        </button>
      </div>
    </aside>
    </div>
  )
}
