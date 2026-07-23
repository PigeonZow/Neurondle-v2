'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CornerTicks } from '@/components/ui/CornerTicks'
import { useFieldGuideStore } from '@/lib/store/fieldGuideStore'
import { useGameStore, selectCurrentRound } from '@/lib/store/gameStore'
import { formatScore, getScoreMessage } from '@/lib/services/scoring'
import type { LabelVerdict, PuzzleStats } from '@/types'

const VERDICT_OPTIONS: { value: LabelVerdict; label: string }[] = [
  { value: 'fits', label: 'Yes' },
  { value: 'off', label: 'No' },
  { value: 'unsure', label: "Can't tell" },
]

interface ScoreRevealProps {
  score: number
  groundTruth: string
  stats: PuzzleStats | null
  onContinue: () => void
}

export function ScoreReveal({ score, groundTruth, stats, onContinue }: ScoreRevealProps) {
  const { message } = getScoreMessage(score)
  const openGuide = useFieldGuideStore(state => state.openGuide)

  const submitLabelVerdict = useGameStore(state => state.submitLabelVerdict)
  const verdict = useGameStore(state => selectCurrentRound(state)?.labelVerdict ?? null)
  const [suggestion, setSuggestion] = useState('')
  const [suggestionResolved, setSuggestionResolved] = useState(false)

  // Community consensus, revealed only after the player has cast their own
  // verdict (their fresh vote isn't in the fetched aggregates, so fold it in)
  const consensus = verdict === null ? null : {
    fits: (stats?.verdicts.fits ?? 0) + (verdict === 'fits' ? 1 : 0),
    off: (stats?.verdicts.off ?? 0) + (verdict === 'off' ? 1 : 0),
    unsure: (stats?.verdicts.unsure ?? 0) + (verdict === 'unsure' ? 1 : 0),
    total: (stats?.verdicts.total ?? 0) + 1,
  }
  const pct = (n: number) => Math.round((n / (consensus?.total || 1)) * 100)

  const handleSuggest = () => {
    const text = suggestion.trim()
    if (!text) return
    submitLabelVerdict('off', text)
    setSuggestionResolved(true)
  }

  return (
    <div className="relative bg-chart/95 rounded-sm border border-graticule/35 shadow-2xl p-5 2xl:p-6 text-center">
      <CornerTicks />
      {/* Verdict */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-4"
      >
        <h2 className="text-xl 2xl:text-2xl font-bold text-starlight">
          {message}
        </h2>
      </motion.div>

      {/* Score number */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-4"
      >
        <span className="font-mono text-4xl 2xl:text-5xl font-semibold text-accent tabular-nums">
          {formatScore(score)}
        </span>
        <span className="text-starlight/50 ml-2">points</span>
      </motion.div>

      {/* Ground truth — still just the auto-labeler's claim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-ink/60 border border-graticule/25 rounded p-4 mb-6 text-left"
      >
        <p className="font-mono text-xs text-starlight/45 mb-1">auto-label:</p>
        <p className="text-base 2xl:text-lg font-medium text-starlight">{groundTruth}</p>
        {/* <button
          onClick={() => openGuide('why-neurondle')}
          className="mt-2 text-xs text-starlight/50 hover:text-accent underline decoration-dotted underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
        >
          How was this label made?
        </button> */}
      </motion.div>

      {/* Verdict on the auto-label: the player grades the labeler, one tap,
          always skippable — Continue is never blocked on it */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mb-6 text-left"
      >
        <p className="text-xs 2xl:text-sm text-starlight/60 mb-2">Does this label fit what you saw?</p>
        <div className="grid grid-cols-3 gap-1.5">
          {VERDICT_OPTIONS.map(({ value, label }) => {
            const selected = verdict === value
            return (
              <button
                key={value}
                onClick={() => {
                  if (value === verdict) return
                  // Changing verdict re-opens the suggestion box if they land
                  // on "Off" again; each change appends a row server-side and
                  // analysis takes the latest.
                  setSuggestionResolved(false)
                  submitLabelVerdict(value)
                }}
                className={`py-1.5 rounded border text-xs 2xl:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60
                  ${selected
                    ? 'border-accent bg-accent/15 text-starlight'
                    : 'border-graticule/40 text-starlight/70 hover:border-accent/60 hover:text-starlight'
                  }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        <AnimatePresence initial={false}>
          {verdict === 'off' && !suggestionResolved && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1.5 pt-2">
                <input
                  type="text"
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSuggest()}
                  placeholder="What fits better?"
                  maxLength={140}
                  autoFocus
                  className="flex-1 min-w-0 bg-ink/50 border border-graticule/40 rounded px-2.5 py-1.5 text-xs 2xl:text-sm text-starlight placeholder-starlight/35 focus:outline-none focus:border-accent/60"
                />
                <button
                  onClick={handleSuggest}
                  disabled={!suggestion.trim()}
                  className={`px-2.5 rounded text-xs 2xl:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60
                    ${suggestion.trim()
                      ? 'bg-accent-deep hover:bg-accent-deep/90 text-starlight'
                      : 'border border-graticule/40 text-starlight/30 cursor-not-allowed'
                    }`}
                >
                  Submit
                </button>
                <button
                  onClick={() => setSuggestionResolved(true)}
                  className="px-2 rounded text-xs 2xl:text-sm text-starlight/50 hover:text-starlight/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {consensus && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-[11px] 2xl:text-xs text-starlight/50 mt-2"
          >
            {consensus.total <= 1
              ? 'You’re the first to judge this label.'
              : `${pct(consensus.fits)}% fits · ${pct(consensus.off)}% off · ${pct(consensus.unsure)}% can’t tell (${consensus.total} verdicts)`}
          </motion.p>
        )}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onContinue}
        className="w-full py-3 bg-accent-deep hover:bg-accent-deep/90 text-starlight rounded font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        Continue
      </motion.button>
    </div>
  )
}
