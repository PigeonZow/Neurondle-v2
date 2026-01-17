'use client'

import { useEffect, useState } from 'react'
import { useGameStore, selectCurrentRound, selectIsGameComplete } from '@/lib/store/gameStore'
import { UmapCanvas } from './UmapCanvas'
import { GameHeader } from './GameHeader'
import { GameControls } from './GameControls'
import { ResultsOverlay } from './ResultsOverlay'
import type { Puzzle, UmapPoint } from '@/types'

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function GameContainer() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [umapData, setUmapData] = useState<UmapPoint[]>([])
  const [searchInput, setSearchInput] = useState('')

  // Debounce search query to avoid lag while typing
  const searchQuery = useDebounce(searchInput, 150)

  const initGame = useGameStore(state => state.initGame)
  const currentRound = useGameStore(selectCurrentRound)
  const currentRoundIndex = useGameStore(state => state.currentRound)
  const isGameComplete = useGameStore(selectIsGameComplete)

  // Get answer point and whether to show it
  const answerPoint = currentRound ? {
    x: currentRound.puzzle.answerX,
    y: currentRound.puzzle.answerY,
  } : null
  const showAnswer = currentRound?.phase === 'reveal'

  useEffect(() => {
    async function loadGame() {
      try {
        // Fetch today's puzzles
        const puzzlesRes = await fetch('/api/puzzles/today')
        if (!puzzlesRes.ok) throw new Error('Failed to load puzzles')
        const puzzles: Puzzle[] = await puzzlesRes.json()

        // Fetch UMAP data
        const umapRes = await fetch('/api/umap')
        if (!umapRes.ok) throw new Error('Failed to load UMAP data')
        const umap: UmapPoint[] = await umapRes.json()

        setUmapData(umap)
        initGame(puzzles)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    loadGame()
  }, [initGame])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto" />
          <p className="text-gray-400">Loading Neurondle...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 rounded hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full-screen UMAP canvas */}
      <UmapCanvas
        data={umapData}
        searchQuery={searchQuery}
        answerPoint={answerPoint}
        showAnswer={showAnswer}
        roundKey={currentRoundIndex}
      />

      {/* Floating header */}
      <GameHeader />

      {/* Search bar - top right */}
      <div className="fixed top-4 right-4 z-20">
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search features..."
            className="w-64 bg-game-surface/90 backdrop-blur border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <GameControls />

      {/* Results overlay (shown when game complete) */}
      {isGameComplete && <ResultsOverlay />}
    </div>
  )
}
