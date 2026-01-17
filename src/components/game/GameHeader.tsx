'use client'

import { useGameStore, selectCurrentRound } from '@/lib/store/gameStore'
import { formatScore } from '@/lib/services/scoring'

export function GameHeader() {
  const currentRoundIndex = useGameStore(state => state.currentRound)
  const totalScore = useGameStore(state => state.totalScore)
  const rounds = useGameStore(state => state.rounds)

  const roundNumber = currentRoundIndex + 1
  const totalRounds = rounds.length || 3

  return (
    <header className="game-overlay fixed top-0 left-0 right-0 p-4">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Round indicator */}
        <div className="bg-game-surface/80 backdrop-blur-sm rounded-lg px-4 py-2">
          <span className="text-sm text-gray-400">Round</span>
          <span className="ml-2 text-lg font-bold">
            {roundNumber}/{totalRounds}
          </span>
        </div>

        {/* Logo */}
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-primary-400">Neuron</span>
          <span className="text-game-highlight">dle</span>
        </h1>

        {/* Score */}
        <div className="bg-game-surface/80 backdrop-blur-sm rounded-lg px-4 py-2">
          <span className="text-sm text-gray-400">Score</span>
          <span className="ml-2 text-lg font-bold text-primary-400">
            {formatScore(totalScore)}
          </span>
        </div>
      </div>
    </header>
  )
}
