'use client'

import { useState, useEffect, useRef } from 'react'
import { useGameStore, selectCurrentRound } from '@/lib/store/gameStore'
import { TokenWithTooltip } from '@/components/ui/TokenWithTooltip'
import type { UmapPoint, TokenActivation } from '@/types'

interface NeuronInspectorProps {
  point: UmapPoint
  anchor: () => { x: number; y: number } | null
  onPin: (point: UmapPoint) => void
  onClose: () => void
}

const CARD_WIDTH = 288 // w-72, used for viewport clamping

export function NeuronInspector({ point, anchor, onPin, onClose }: NeuronInspectorProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ maxValue: number; tokens: TokenActivation[] } | null>(null)

  const currentRound = useGameStore(selectCurrentRound)
  const sessionId = useGameStore(state => state.sessionId)
  const gameId = useGameStore(state => state.gameId)

  // Reset test state when switching neurons
  useEffect(() => {
    setText('')
    setResult(null)
  }, [point.index])

  // Follow the dot as the camera moves (same RAF pattern as the jump label)
  useEffect(() => {
    let raf = 0
    const track = () => {
      const pos = anchor()
      const el = cardRef.current
      if (pos && el) {
        const flipX = pos.x + 24 + CARD_WIDTH > window.innerWidth
        const x = flipX ? pos.x - 24 - CARD_WIDTH : pos.x + 24
        const y = Math.min(Math.max(pos.y - 40, 72), window.innerHeight - el.offsetHeight - 16)
        el.style.transform = `translate(${x}px, ${y}px)`
      }
      raf = requestAnimationFrame(track)
    }
    raf = requestAnimationFrame(track)
    return () => cancelAnimationFrame(raf)
  }, [anchor])

  // Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
          featureIndex: point.index,
          text: text.trim(),
          testKind: 'candidate',
          sessionId,
          gameId,
          puzzleId: currentRound.puzzle.id,
          roundNumber: currentRound.puzzle.roundNumber,
        }),
      })
      if (!response.ok) throw new Error('Candidate test failed')
      const data = await response.json()
      setResult({
        maxValue: data.maxValue,
        tokens: data.tokens.map((token: string, i: number): TokenActivation => ({
          token,
          activation: data.values[i] ?? 0,
        })),
      })
    } catch (error) {
      console.error('Candidate test error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={cardRef}
      className="game-overlay fixed left-0 top-0 z-40 w-72 bg-game-surface/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-xl p-3"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-gray-400 font-mono">Feature #{point.index}</p>
        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="text-gray-400 hover:text-white p-0.5 -m-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-white mb-3">
        <span className="text-gray-400 text-xs">auto-label: </span>
        {point.description || 'No label'}
      </p>

      <div className="flex gap-1.5 mb-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTest()}
          placeholder="Test this neuron..."
          className="flex-1 min-w-0 bg-white/5 border border-white/10 hover:border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/60 focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-primary-500/30 transition-colors"
        />
        <button
          onClick={handleTest}
          disabled={loading || !text.trim()}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight ${
            loading || !text.trim()
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {loading ? '...' : 'Test'}
        </button>
      </div>

      {result && (
        <div className="bg-white/5 rounded-lg p-2 mb-2 max-h-36 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Max activation:</span>
            <span className="text-xs font-mono text-primary-400">{result.maxValue.toFixed(2)}</span>
          </div>
          <div className="flex flex-wrap gap-0.5">
            {result.tokens.map((t, i) => (
              <TokenWithTooltip
                key={i}
                token={t.token}
                activation={t.activation}
                maxActivation={result.maxValue}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onPin(point)}
        className="w-full py-1.5 rounded-lg text-sm font-medium bg-game-highlight/20 hover:bg-game-highlight/30 text-game-highlight border border-game-highlight/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
      >
        Select this neuron
      </button>
    </div>
  )
}
