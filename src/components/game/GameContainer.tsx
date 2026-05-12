'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useGameStore, selectCurrentRound, selectIsGameComplete } from '@/lib/store/gameStore'
import { UmapCanvas, UmapCanvasRef } from './UmapCanvas'
import { GameHeader } from './GameHeader'
import { GameControls } from './GameControls'
import { ResultsOverlay } from './ResultsOverlay'
import { ConsentModal } from '@/components/ConsentModal'
import { ConsentBadge } from '@/components/ConsentBadge'
import { OnboardingFlow } from '@/components/OnboardingFlow'
import type { Puzzle, UmapPoint } from '@/types'

export function GameContainer() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [umapData, setUmapData] = useState<UmapPoint[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const umapRef = useRef<UmapCanvasRef>(null)

  const initGame = useGameStore(state => state.initGame)
  const currentRound = useGameStore(selectCurrentRound)
  const currentRoundIndex = useGameStore(state => state.currentRound)
  const isGameComplete = useGameStore(selectIsGameComplete)

  const answerPoint = currentRound
    ? { x: currentRound.puzzle.answerX, y: currentRound.puzzle.answerY }
    : null
  const showAnswer = currentRound?.phase === 'reveal'

  useEffect(() => {
    async function loadGame() {
      try {
        const puzzlesRes = await fetch('/api/puzzles/today')
        if (!puzzlesRes.ok) throw new Error('Failed to load puzzles')
        const puzzles: Puzzle[] = await puzzlesRes.json()

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

  const handleJumpToPoint = useCallback((point: UmapPoint) => {
    umapRef.current?.centerOnPoint({ x: point.x, y: point.y })
    umapRef.current?.setSearchHighlight({ x: point.x, y: point.y })
  }, [])

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
      <ConsentModal />
      <ConsentBadge />
      <OnboardingFlow />

      <UmapCanvas
        ref={umapRef}
        data={umapData}
        searchQuery={searchQuery}
        answerPoint={answerPoint}
        showAnswer={!!showAnswer}
        roundKey={currentRoundIndex}
      />

      <GameHeader />

      <GameControls
        umapData={umapData}
        onFilterChange={setSearchQuery}
        onJumpToPoint={handleJumpToPoint}
      />

      {isGameComplete && <ResultsOverlay />}
    </div>
  )
}
