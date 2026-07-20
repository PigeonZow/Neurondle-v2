'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, selectCurrentRound, selectIsGameComplete } from '@/lib/store/gameStore'
import { UmapCanvas, UmapCanvasRef } from './UmapCanvas'
import { NeuronInspector } from './NeuronInspector'
import { GameHeader } from './GameHeader'
import { GameControls } from './GameControls'
import { ResultsOverlay } from './ResultsOverlay'
import { ScoreReveal } from './ScoreReveal'
import { ConsentModal } from '@/components/ConsentModal'
import { ConsentBadge } from '@/components/ConsentBadge'
import { OnboardingFlow } from '@/components/OnboardingFlow'
import { useConsentStore } from '@/lib/store/consentStore'
import { ensureSession, persistSessionConsent } from '@/lib/services/sessions'
import type { Puzzle, UmapPoint } from '@/types'

export function GameContainer() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [umapData, setUmapData] = useState<UmapPoint[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [matchCursor, setMatchCursor] = useState(-1)
  const [inspected, setInspected] = useState<UmapPoint | null>(null)
  const [exploring, setExploring] = useState(false)

  const umapRef = useRef<UmapCanvasRef>(null)

  // Matches for the active highlight filter, in stable point-index order.
  // Single source of truth for both the canvas highlights and the jump cycler.
  const matchedPoints = useMemo(() => {
    if (!searchQuery) return []
    const query = searchQuery.toLowerCase()
    return umapData.filter(p => p.description?.toLowerCase().includes(query))
  }, [searchQuery, umapData])

  const highlightIndices = useMemo(
    () => new Set(matchedPoints.map(p => p.index)),
    [matchedPoints]
  )

  const initGame = useGameStore(state => state.initGame)
  const setSessionId = useGameStore(state => state.setSessionId)
  const currentRound = useGameStore(selectCurrentRound)
  const currentRoundIndex = useGameStore(state => state.currentRound)
  const isGameComplete = useGameStore(selectIsGameComplete)
  const nextRound = useGameStore(state => state.nextRound)

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

        // The cached UMAP JSON serves index as a string; normalize here so it
        // matches the declared number type (probe results compare by ===)
        setUmapData(umap.map(p => ({ ...p, index: Number(p.index) })))
        initGame(puzzles)
        setLoading(false)

        // Get-or-create the backend session, then sync the current consent
        // choice (handles returning users whose consent is already decided).
        const session = await ensureSession()
        if (session?.id) setSessionId(session.id)
        const consentStatus = useConsentStore.getState().consentStatus
        void persistSessionConsent(consentStatus === 'accepted')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }
    loadGame()
  }, [initGame, setSessionId])

  const handleJumpToPoint = useCallback((point: UmapPoint) => {
    umapRef.current?.centerOnPoint({ x: point.x, y: point.y })
    umapRef.current?.setSearchHighlight({ x: point.x, y: point.y })
    umapRef.current?.showPointLabel(point)
  }, [])

  const handleFilterChange = useCallback((query: string) => {
    setSearchQuery(query)
    setMatchCursor(-1)
    umapRef.current?.setSearchHighlight(null)
    umapRef.current?.showPointLabel(null)
  }, [])

  // Close the inspector and leave explore mode when the round changes
  useEffect(() => {
    setInspected(null)
    setExploring(false)
  }, [currentRoundIndex])

  const handleInspectorAnchor = useCallback(
    () => (inspected ? umapRef.current?.getScreenPos(inspected) ?? null : null),
    [inspected]
  )

  const handleInspectorPin = useCallback((point: UmapPoint) => {
    umapRef.current?.pinAtPoint({ x: point.x, y: point.y })
    setInspected(null)
  }, [])

  const handleProbeResults = useCallback(
    (results: { index: number; maxValue: number }[]) => {
      umapRef.current?.showProbeGlow(
        results.map(r => ({ index: r.index, value: r.maxValue }))
      )
    },
    []
  )

  const handleJumpToMatch = useCallback((direction: 1 | -1) => {
    if (matchedPoints.length === 0) return
    const next = matchCursor === -1
      ? (direction === 1 ? 0 : matchedPoints.length - 1)
      : (matchCursor + direction + matchedPoints.length) % matchedPoints.length
    setMatchCursor(next)
    const point = matchedPoints[next]
    umapRef.current?.centerOnPoint({ x: point.x, y: point.y })
    umapRef.current?.setSearchHighlight({ x: point.x, y: point.y })
    umapRef.current?.showPointLabel(point)
  }, [matchedPoints, matchCursor])

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

  const isReveal = currentRound?.phase === 'reveal' && currentRound.score !== null

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <ConsentModal />
      <ConsentBadge />
      <OnboardingFlow />

      <UmapCanvas
        ref={umapRef}
        data={umapData}
        highlightIndices={highlightIndices}
        answerPoint={answerPoint}
        showAnswer={!!showAnswer}
        roundKey={currentRoundIndex}
        onInspectPoint={setInspected}
      />

      <GameHeader
        umapData={umapData}
        matchCount={matchedPoints.length}
        matchCursor={matchCursor}
        onFilterChange={handleFilterChange}
        onJumpToMatch={handleJumpToMatch}
        onJumpToPoint={handleJumpToPoint}
      />

      <GameControls onProbeResults={handleProbeResults} />

      {inspected && (
        <NeuronInspector
          point={inspected}
          anchor={handleInspectorAnchor}
          onPin={handleInspectorPin}
          onClose={() => setInspected(null)}
        />
      )}

      <AnimatePresence>
        {isReveal && !exploring && currentRound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          >
            <div className="max-w-md w-full">
              <ScoreReveal
                score={currentRound.score!}
                distance={currentRound.distance!}
                groundTruth={currentRound.puzzle.groundTruthLabel}
                onContinue={nextRound}
                onExplore={() => setExploring(true)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explore mode: reveal overlay dismissed, map fully interactive */}
      {isReveal && exploring && (
        <div className="game-overlay fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={nextRound}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-full font-semibold shadow-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
          >
            Continue
          </button>
        </div>
      )}

      {isGameComplete && <ResultsOverlay />}
    </div>
  )
}
