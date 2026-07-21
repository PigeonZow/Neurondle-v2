'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { TokenWithTooltip } from '@/components/ui/TokenWithTooltip'
import type { Hint } from '@/types'

interface HintPanelProps {
  hints: Hint[]
  totalHints: number
  hintsRevealed: number
  onRevealHint: () => void
}

export function HintPanel({ hints, totalHints, hintsRevealed, onRevealHint }: HintPanelProps) {
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
              key={hint.id}
              layout
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="bg-ink/50 border border-graticule/25 rounded p-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs 2xl:text-sm text-starlight/50">Hint {hint.level}</span>
                <span className="text-xs 2xl:text-sm font-mono text-starlight/60">
                  {hint.score.toFixed(1)}
                </span>
              </div>
              <div className="flex flex-wrap gap-0.5">
                {hint.tokens.map((t, i) => {
                  const maxAct = Math.max(...hint.tokens.map(tk => tk.activation), 0.01)
                  return (
                    <TokenWithTooltip
                      key={i}
                      token={t.token}
                      activation={t.activation}
                      maxActivation={maxAct}
                    />
                  )
                })}
              </div>
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
