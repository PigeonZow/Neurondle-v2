'use client'

import { useOnboardingStore } from '@/lib/store/onboardingStore'
import { FeatureSearch } from './FeatureSearch'
import type { UmapPoint } from '@/types'

interface GameHeaderProps {
  umapData: UmapPoint[]
  onFilterChange: (query: string) => void
  onJumpToPoint: (point: UmapPoint) => void
}

export function GameHeader({ umapData, onFilterChange, onJumpToPoint }: GameHeaderProps) {
  const triggerReplay = useOnboardingStore(state => state.triggerReplay)

  return (
    <header className="game-overlay fixed top-0 inset-x-0 z-40 h-14 bg-game-surface/70 backdrop-blur-md border-b border-white/15 shadow-lg">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-6 px-6 h-full">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-primary-400">Neuron</span>
          <span className="text-game-highlight">dle</span>
        </h1>

        <div className="max-w-2xl mx-auto w-full">
          <FeatureSearch
            data={umapData}
            onFilterChange={onFilterChange}
            onJumpToPoint={onJumpToPoint}
          />
        </div>

        <button
          onClick={triggerReplay}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
          aria-label="Replay tutorial"
        >
          <span className="font-bold">?</span>
          <span>Tutorial</span>
        </button>
      </div>
    </header>
  )
}
