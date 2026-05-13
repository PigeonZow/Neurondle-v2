'use client'

import { useState } from 'react'
import { useGameStore, selectCurrentRound } from '@/lib/store/gameStore'
import { TokenWithTooltip } from '@/components/ui/TokenWithTooltip'
import type { ActivationTest, TokenActivation } from '@/types'

export function TestInput() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ActivationTest | null>(null)

  const currentRound = useGameStore(selectCurrentRound)
  const addActivationTest = useGameStore(state => state.addActivationTest)

  if (!currentRound) return null

  const handleTest = async () => {
    if (!text.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: currentRound.puzzle.modelId,
          layer: currentRound.puzzle.layer,
          featureIndex: currentRound.puzzle.featureIndex,
          text: text.trim(),
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
          className="flex-1 bg-white/5 border border-white/10 hover:border-white/15 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/60 focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-primary-500/30 transition-colors"
        />
        <button
          onClick={handleTest}
          disabled={loading || !text.trim()}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight
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
        <div className="bg-white/5 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Max activation:</span>
            <span className="text-xs font-mono text-primary-400">{maxActivation.toFixed(2)}</span>
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
        </div>
      )}
    </div>
  )
}
