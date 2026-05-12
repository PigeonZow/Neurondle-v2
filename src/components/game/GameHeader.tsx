'use client'

import { useGameStore, selectCurrentRound } from '@/lib/store/gameStore'
import { useOnboardingStore } from '@/lib/store/onboardingStore'
import { formatScore } from '@/lib/services/scoring'

export function GameHeader() {
  const currentRoundIndex = useGameStore(state => state.currentRound)
  const totalScore = useGameStore(state => state.totalScore)
  const rounds = useGameStore(state => state.rounds)
  const triggerReplay = useOnboardingStore(state => state.triggerReplay)

  const roundNumber = currentRoundIndex + 1
  const totalRounds = rounds.length || 3

  return (
    <header className="game-overlay fixed top-0 left-0 right-0 p-4">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Round indicator */}
        <div className="bg-game-surface rounded-lg px-4 py-2.5 border border-white/15 shadow-xl">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Round</span>
          <span className="ml-2 text-lg font-bold">
            {roundNumber}/{totalRounds}
          </span>
        </div>

        {/* Logo */}
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-primary-400">Neuron</span>
          <span className="text-game-highlight">dle</span>
        </h1>

        {/* Score + replay button */}
        <div className="flex items-center gap-2">
          <div className="bg-game-surface rounded-lg px-4 py-2.5 border border-white/15 shadow-xl">
            <span className="text-[10px] uppercase tracking-widest text-gray-400">Score</span>
            <span className="ml-2 text-lg font-bold text-primary-400">
              {formatScore(totalScore)}
            </span>
          </div>
          <button
            onClick={triggerReplay}
            className="bg-game-surface rounded-lg px-3 py-2.5 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-base font-bold border border-white/15 shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
            aria-label="Replay tutorial"
            title="Replay tutorial"
          >
            ?
          </button>
        </div>
      </div>
    </header>
  )
}
