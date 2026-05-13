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
        <span className="text-[10px] uppercase tracking-widest text-gray-200">
          Hints ({hintsRevealed}/{totalHints})
        </span>
        <button
          onClick={onRevealHint}
          disabled={!canRevealMore}
          className={`
            text-xs px-2 py-0.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight
            ${canRevealMore
              ? 'bg-primary-600/20 text-primary-400 hover:bg-primary-600/30'
              : 'text-gray-600 cursor-not-allowed'
            }
          `}
        >
          {canRevealMore ? 'Reveal Next' : 'All Revealed'}
        </button>
      </div>

      <div className="space-y-1.5">
        <AnimatePresence>
          {hints.map((hint, index) => (
            <motion.div
              key={hint.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 rounded-lg p-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Hint {hint.level}</span>
                <span className="text-xs font-mono text-gray-300">
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
          <p className="text-center text-gray-500 py-4">
            Click &quot;Reveal Next&quot; to see hints
          </p>
        )}
      </div>
    </div>
  )
}
