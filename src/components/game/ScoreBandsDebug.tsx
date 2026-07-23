'use client'

// Dev overlay for tuning scoring.ts — visualizes the verdict bands in score
// space and distance space, derived live from getScoreMessage/calculateScore.
// Hidden unless the app is loaded with ?debug=bands (see lib/debug.ts).

import { useEffect, useMemo, useState } from 'react'
import { calculateScore, getScoreMessage } from '@/lib/services/scoring'
import { scoreBandsDebugEnabled } from '@/lib/debug'

const MAX_DIST = 6 // units shown on the distance bar

const BAND_COLORS: Record<string, string> = {
  'Direct hit': 'rgb(var(--verdant))',
  'Near miss': 'rgb(var(--beacon))',
  'Close': 'rgb(var(--accent))',
  'Similar region': 'rgb(var(--ember))',
  'Far off': 'rgb(var(--alert) / 0.75)',
  'Way off': 'rgb(var(--graticule))',
}
const bandColor = (m: string) => BAND_COLORS[m] ?? 'rgb(var(--starlight) / 0.4)'

interface Band { message: string; from: number; to: number }

export function ScoreBandsDebug() {
  const [hidden, setHidden] = useState(false)
  // Set post-mount so the server-rendered markup (always off) matches
  const [enabled, setEnabled] = useState(false)
  useEffect(() => { setEnabled(scoreBandsDebugEnabled()) }, [])

  // Contiguous message bands over the score axis 0..10000
  const scoreBands = useMemo<Band[]>(() => {
    const out: Band[] = []
    let cur = getScoreMessage(0).message
    let start = 0
    for (let s = 1; s <= 10000; s++) {
      const m = getScoreMessage(s).message
      if (m !== cur) {
        out.push({ message: cur, from: start, to: s - 1 })
        cur = m
        start = s
      }
    }
    out.push({ message: cur, from: start, to: 10000 })
    return out
  }, [])

  // Contiguous message bands over the distance axis 0..MAX_DIST, i.e. what
  // a player can actually reach through calculateScore
  const distBands = useMemo<Band[]>(() => {
    const out: Band[] = []
    const step = 0.005
    let cur = getScoreMessage(calculateScore(0)).message
    let start = 0
    for (let d = step; d <= MAX_DIST; d += step) {
      const m = getScoreMessage(calculateScore(d)).message
      if (m !== cur) {
        out.push({ message: cur, from: start, to: d })
        cur = m
        start = d
      }
    }
    out.push({ message: cur, from: start, to: MAX_DIST })
    return out
  }, [])

  const reachable = useMemo(() => new Set(distBands.map(b => b.message)), [distBands])

  if (!enabled || hidden) return null

  return (
    <div className="fixed right-4 top-20 2xl:top-24 z-40 w-[22rem] bg-chart/95 border border-graticule/40 rounded-sm shadow-2xl p-4 font-mono text-[11px] text-starlight/70">
      <div className="flex items-center justify-between mb-3">
        <span className="uppercase tracking-[0.18em] text-starlight/45 text-[10px]">
          Score bands (temp)
        </span>
        <button
          onClick={() => setHidden(true)}
          aria-label="Hide score bands"
          className="text-starlight/40 hover:text-starlight/80"
        >
          ✕
        </button>
      </div>

      {/* Score axis */}
      <p className="mb-1 text-starlight/45">score 0 → 10,000</p>
      <div className="flex h-3 w-full rounded-sm overflow-hidden mb-3">
        {scoreBands.map(b => (
          <div
            key={`s-${b.message}`}
            style={{
              width: `${((b.to - b.from + 1) / 10001) * 100}%`,
              backgroundColor: bandColor(b.message),
            }}
            title={`${b.message}: ${b.from}–${b.to}`}
          />
        ))}
      </div>

      {/* Distance axis (what's actually reachable) */}
      <p className="mb-1 text-starlight/45">distance 0 → {MAX_DIST} units</p>
      <div className="flex h-3 w-full rounded-sm overflow-hidden mb-3">
        {distBands.map((b, i) => (
          <div
            key={`d-${i}`}
            style={{
              width: `${((b.to - b.from) / MAX_DIST) * 100}%`,
              backgroundColor: bandColor(b.message),
            }}
            title={`${b.message}: ${b.from.toFixed(2)}–${b.to.toFixed(2)} units`}
          />
        ))}
      </div>

      {/* Legend with exact ranges */}
      <div className="space-y-1">
        {scoreBands.slice().reverse().map(b => {
          const d = distBands.filter(x => x.message === b.message)
          const distLabel = d.length
            ? d.map(x => `${x.from.toFixed(2)}–${x.to.toFixed(2)}u`).join(', ')
            : 'UNREACHABLE'
          return (
            <div key={b.message} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: bandColor(b.message) }}
              />
              <span className="w-24 shrink-0 text-starlight/85">{b.message}</span>
              <span className="tabular-nums">{b.from}–{b.to}</span>
              <span
                className={`ml-auto tabular-nums ${reachable.has(b.message) ? 'text-starlight/50' : 'text-alert'}`}
              >
                {distLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
