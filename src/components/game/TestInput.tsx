'use client'

import { useState, useEffect } from 'react'
import { useGameStore, selectCurrentRound } from '@/lib/store/gameStore'
import { TokenWithTooltip } from '@/components/ui/TokenWithTooltip'
import type { ActivationTest, TokenActivation } from '@/types'

interface TestInputProps {
  onProbeResults: (results: { index: number; maxValue: number }[], text: string) => void
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
    const probeText = text.trim()

    // Map-wide probe with the same text: lights up the top-activating dots.
    // Fire-and-forget so the mystery result isn't delayed by it.
    fetch('/api/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: currentRound.puzzle.modelId,
        layer: currentRound.puzzle.layer,
        text: probeText,
        sessionId,
        gameId,
        puzzleId: currentRound.puzzle.id,
        roundNumber: currentRound.puzzle.roundNumber,
      }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.results) onProbeResults(d.results, probeText) })
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
          placeholder="Your custom text..."
          className="flex-1 bg-ink/50 border border-graticule/40 hover:border-graticule/60 rounded px-3 py-1.5 2xl:py-2 text-sm 2xl:text-base text-starlight placeholder-starlight/35 focus:outline-none focus:border-accent/60 focus:bg-ink/70 focus-visible:ring-2 focus-visible:ring-accent/25 transition-colors"
        />
        <button
          onClick={handleTest}
          disabled={loading || !text.trim()}
          className={`
            px-3 2xl:px-4 py-1.5 2xl:py-2 rounded text-sm 2xl:text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60
            ${loading || !text.trim()
              ? 'border border-graticule/40 text-starlight/30 cursor-not-allowed'
              : 'bg-starlight/10 hover:bg-starlight/20 text-starlight'
            }
          `}
        >
          {loading ? '...' : 'Test'}
        </button>
      </div>

      {/* Result display */}
      {result && (
        <div className="bg-ink/50 border border-graticule/25 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs 2xl:text-sm text-starlight/50">Custom text</span>
            <span className="text-xs 2xl:text-sm font-mono text-accent">{maxActivation.toFixed(2)}</span>
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
          {/* <p className="text-[10px] text-gray-500 mt-1">magenta glow on the map = where this text activates</p> */}
          {result.text.trimStart().startsWith('<bos>') && (
            <p className="text-[10px] text-starlight/40 mt-1">
              A leading &lt;bos&gt; is read as the model&apos;s start-of-sequence token, so it isn&apos;t shown above.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
