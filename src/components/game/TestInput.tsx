'use client'

import { useState, useEffect } from 'react'
import { useGameStore, selectCurrentRound } from '@/lib/store/gameStore'
import { TokenWithTooltip } from '@/components/ui/TokenWithTooltip'
import type { ActivationTest, TokenActivation } from '@/types'

interface TestInputProps {
  onProbeResults: (results: { index: number; maxValue: number }[]) => void
}

export function TestInput({ onProbeResults }: TestInputProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ActivationTest | null>(null)

  const currentRound = useGameStore(selectCurrentRound)
  const sessionId = useGameStore(state => state.sessionId)
  const gameId = useGameStore(state => state.gameId)
  const addActivationTest = useGameStore(state => state.addActivationTest)

  // Reset the input and last result when the round changes — a previous round's
  // activation is irrelevant to the new puzzle.
  const puzzleId = currentRound?.puzzle.id
  useEffect(() => {
    setText('')
    setResult(null)
  }, [puzzleId])

  if (!currentRound) return null

  const handleTest = async () => {
    if (!text.trim() || loading) return

    setLoading(true)

    // Map-wide probe with the same text: lights up the top-activating dots.
    // Fire-and-forget so the mystery result isn't delayed by it.
    fetch('/api/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: currentRound.puzzle.modelId,
        layer: currentRound.puzzle.layer,
        text: text.trim(),
        sessionId,
        gameId,
        puzzleId: currentRound.puzzle.id,
        roundNumber: currentRound.puzzle.roundNumber,
      }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.results) onProbeResults(d.results) })
      .catch(() => {})

    try {
      const response = await fetch('/api/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: currentRound.puzzle.modelId,
          layer: currentRound.puzzle.layer,
          featureIndex: currentRound.puzzle.featureIndex,
          text: text.trim(),
          // Context for research logging (the route stores this text along with
          // the metadata). Skipped server-side for mock puzzles.
          sessionId,
          gameId,
          puzzleId: currentRound.puzzle.id,
          roundNumber: currentRound.puzzle.roundNumber,
        }),
      })

      if (!response.ok) throw new Error('Activation test failed')

      const data = await response.json()

      const test: ActivationTest = {
        id: crypto.randomUUID(),
        text: text.trim(),
        maxScore: data.maxValue,
        tokens: data.tokens.map((token: string, i: number): TokenActivation => ({
          token,
          activation: data.values[i] ?? 0,
        })),
        timestamp: new Date(),
      }

      setResult(test)
      addActivationTest(test)
      setText('')
    } catch (error) {
      console.error('Activation test error:', error)
    } finally {
      setLoading(false)
    }
  }

  const maxActivation = result?.maxScore ?? 0

  return (
    <div className="space-y-2" data-onboarding="activation-input">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTest()}
          placeholder="Test custom activation..."
          className="flex-1 bg-white/5 border border-white/10 hover:border-white/15 rounded-lg px-3 py-1.5 2xl:py-2 text-sm 2xl:text-base text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/60 focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-primary-500/30 transition-colors"
        />
        <button
          onClick={handleTest}
          disabled={loading || !text.trim()}
          className={`
            px-3 2xl:px-4 py-1.5 2xl:py-2 rounded-lg text-sm 2xl:text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight
            ${loading || !text.trim()
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
            }
          `}
        >
          {loading ? '...' : 'Test'}
        </button>
      </div>

      {/* Result display */}
      {result && (
        <div className="bg-white/5 rounded-lg p-2 max-h-40 2xl:max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs 2xl:text-sm text-gray-400">Max activation:</span>
            <span className="text-xs 2xl:text-sm font-mono text-primary-400">{maxActivation.toFixed(2)}</span>
          </div>
          <div className="flex flex-wrap gap-0.5">
            {result.tokens.map((t, i) => (
              <TokenWithTooltip
                key={i}
                token={t.token}
                activation={t.activation}
                maxActivation={maxActivation}
              />
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-1">magenta glow on the map = where this text activates</p>
        </div>
      )}
    </div>
  )
}
