'use client'

import { useOnboardingStore } from '@/lib/store/onboardingStore'
import { FeatureSearch } from './FeatureSearch'
import type { UmapPoint } from '@/types'

interface GameHeaderProps {
  umapData: UmapPoint[]
  matchCount: number
  matchCursor: number
  onFilterChange: (query: string) => void
  onJumpToMatch: (direction: 1 | -1) => void
  onJumpToPoint: (point: UmapPoint) => void
}

export function GameHeader({
  umapData,
  matchCount,
  matchCursor,
  onFilterChange,
  onJumpToMatch,
  onJumpToPoint,
}: GameHeaderProps) {
  const triggerReplay = useOnboardingStore(state => state.triggerReplay)

  return (
    <header className="game-overlay fixed top-0 inset-x-0 z-40 h-14 2xl:h-16 min-[1920px]:h-20 bg-chart/90 border-b border-graticule/35 shadow-lg">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-6 px-6 2xl:px-8 h-full">
        <h1 className="font-wordmark text-2xl 2xl:text-3xl font-bold tracking-tight">
          <span className="text-accent">Neuron</span>
          <span className="text-alert">dle</span>
        </h1>

        <div className="max-w-2xl 2xl:max-w-3xl min-[1920px]:max-w-4xl mx-auto w-full">
          <FeatureSearch
            data={umapData}
            matchCount={matchCount}
            matchCursor={matchCursor}
            onFilterChange={onFilterChange}
            onJumpToMatch={onJumpToMatch}
            onJumpToPoint={onJumpToPoint}
          />
        </div>

        <button
          onClick={triggerReplay}
          className="flex items-center gap-2 px-3 2xl:px-4 py-1.5 2xl:py-2 rounded text-sm 2xl:text-base text-starlight/70 hover:text-starlight hover:bg-starlight/5 border border-graticule/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          aria-label="Replay tutorial"
        >
          <span className="font-bold">?</span>
          <span>Tutorial</span>
        </button>
      </div>
    </header>
  )
}
