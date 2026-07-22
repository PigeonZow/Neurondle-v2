'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TokenWithTooltip } from '@/components/ui/TokenWithTooltip'
import type { Hint } from '@/types'

// Tokens of context shown on each side of the strongest token when collapsed
const CONTEXT_TOKENS = 10

interface HintPanelProps {
  hints: Hint[]
  totalHints: number
  hintsRevealed: number
  puzzleId: string
  onRevealHint: () => void
}

// Neuronpedia-style snippet: focus on the window around the max-activating
// token by default; click to reveal the full text.
function HintCard({ hint }: { hint: Hint }) {
  const [expanded, setExpanded] = useState(false)

  const maxAct = Math.max(...hint.tokens.map(tk => tk.activation), 0.01)
  const maxIdx = hint.tokens.reduce(
    (best, t, i) => (t.activation > hint.tokens[best].activation ? i : best),
    0
  )

  const start = Math.max(0, maxIdx - CONTEXT_TOKENS)
  const end = Math.min(hint.tokens.length, maxIdx + CONTEXT_TOKENS + 1)
  // Not worth a collapse affordance when the window nearly covers the text
  const collapsible = hint.tokens.length > end - start + 6
  const showAll = expanded || !collapsible
  const visible = showAll ? hint.tokens : hint.tokens.slice(start, end)

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs 2xl:text-sm text-starlight/50">Hint {hint.level}</span>
        <span className="text-xs 2xl:text-sm font-mono text-starlight/60">
          {hint.score.toFixed(1)}
        </span>
      </div>
      <div
        className={collapsible ? 'cursor-pointer' : undefined}
        onClick={collapsible ? () => setExpanded(e => !e) : undefined}
      >
        {/* items-center keeps the ellipses from stretching the row height —
            stretched flex items would fatten the token highlights */}
        <div className="flex flex-wrap items-center gap-0.5">
          {!showAll && start > 0 && (
            <span className="text-xs 2xl:text-sm leading-none text-starlight/35 px-0.5" aria-hidden>&hellip;</span>
          )}
          {visible.map((t, i) => (
            <TokenWithTooltip
              key={i}
              token={t.token}
              activation={t.activation}
              maxActivation={maxAct}
            />
          ))}
          {!showAll && end < hint.tokens.length && (
            <span className="text-xs 2xl:text-sm leading-none text-starlight/35 px-0.5" aria-hidden>&hellip;</span>
          )}
        </div>
        {collapsible && (
          <p className="mt-1 text-[10px] 2xl:text-xs text-starlight/40">
            {expanded ? 'show highlight only' : 'show full text'}
          </p>
        )}
      </div>
    </>
  )
}

export function HintPanel({ hints, totalHints, hintsRevealed, puzzleId, onRevealHint }: HintPanelProps) {
  const canRevealMore = hintsRevealed < totalHints

  return (
    <div className="space-y-3" data-onboarding="hint-panel">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] 2xl:text-xs uppercase tracking-[0.18em] text-starlight/45">
          Hints <span className="tabular-nums">({hintsRevealed}/{totalHints})</span>
        </span>
        <button
          onClick={onRevealHint}
          disabled={!canRevealMore}
          className={`
            text-xs 2xl:text-sm px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60
            ${canRevealMore
              ? 'bg-accent/10 text-accent hover:bg-accent/20'
              : 'text-starlight/30 cursor-not-allowed'
            }
          `}
        >
          {canRevealMore ? 'Reveal Next' : 'All Revealed'}
        </button>
      </div>

      <div className="space-y-1.5 max-h-52 2xl:max-h-96 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {[...hints].reverse().map((hint) => (
            <motion.div
              // Hint ids repeat across puzzles ("hint_1"...), so scope the key
              // to the puzzle or expansion state would leak between rounds
              key={`${puzzleId}:${hint.id}`}
              layout
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="bg-ink/50 border border-graticule/25 rounded p-2"
            >
              <HintCard hint={hint} />
            </motion.div>
          ))}
        </AnimatePresence>

        {hints.length === 0 && (
          <p className="text-center text-starlight/40 py-4">
            Click &quot;Reveal Next&quot; to see hints
          </p>
        )}
      </div>
    </div>
  )
}
