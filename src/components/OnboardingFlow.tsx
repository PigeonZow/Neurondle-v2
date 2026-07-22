'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Mouse, Hand, ArrowRight, Check } from 'lucide-react'
import { CornerTicks } from '@/components/ui/CornerTicks'
import { useConsentStore } from '@/lib/store/consentStore'
import { useOnboardingStore } from '@/lib/store/onboardingStore'
import { useFieldGuideStore } from '@/lib/store/fieldGuideStore'

const STORAGE_KEY = 'neurondle-onboarding-v1'
const TOOLTIP_W = 320
const TOOLTIP_H = 190
const GAP = 16

const STEPS = [
  {
    selector: '[data-onboarding="umap-canvas"]',
    title: 'The map',
    body: null, // step 0 renders its own centered card below
  },
  {
    selector: '[data-onboarding="hint-panel"]',
    title: 'Hints',
    body: null, // rendered as two paragraphs
  },
  {
    selector: '[data-onboarding="activation-input"]',
    title: 'Probe',
    body: 'Type any text to see how strongly the mystery neuron activates on it. The map also glows where that text lands.',
  },
  {
    selector: '[data-onboarding="feature-search"]',
    title: 'Search the map and place a pin',
    body: 'Search the map for concepts. Click a dot to pin and inspect that neuron, or click empty space to drop your pin anywhere.',
  },
  {
    selector: '[data-onboarding="lock-in-button"]',
    title: 'Lock in',
    body: 'When you\'re ready to guess, click here. Closer pins earn higher scores.',
  },
]

// Pre-computed dot positions [cx, cy, r, opacity] — three loose clusters + sparse outliers
const SCATTER_DOTS: Array<[number, number, number, number]> = [
  // Cluster A — left
  [22, 44, 2.5, 0.70], [28, 36, 1.5, 0.50], [34, 51, 2.0, 0.60],
  [18, 54, 1.5, 0.40], [30, 60, 1.5, 0.50], [14, 42, 2.0, 0.35],
  [38, 40, 1.5, 0.55], [24, 28, 1.5, 0.40], [40, 58, 2.0, 0.60],
  [12, 50, 1.5, 0.45], [20, 62, 1.5, 0.35],
  // Cluster B — centre
  [97, 24, 2.5, 0.70], [104, 16, 1.5, 0.50], [90, 30, 2.0, 0.60],
  [110, 36, 1.5, 0.45], [97, 42, 2.0, 0.55], [84, 18, 1.5, 0.40],
  [116, 22, 1.5, 0.50], [100, 10, 2.0, 0.40], [107, 48, 1.5, 0.45],
  [92, 50, 1.5, 0.35],
  // Cluster C — right
  [166, 38, 2.5, 0.65], [174, 30, 1.5, 0.50], [160, 48, 2.0, 0.60],
  [180, 42, 1.5, 0.45], [170, 56, 2.0, 0.55], [156, 32, 1.5, 0.40],
  [184, 36, 1.5, 0.50], [163, 22, 2.0, 0.40], [177, 60, 1.5, 0.40],
  [150, 40, 1.5, 0.35],
  // Sparse outliers
  [52, 14, 1.5, 0.30], [74, 66, 1.5, 0.30], [132, 62, 1.5, 0.25],
  [146, 14, 1.5, 0.30], [62, 56, 1.5, 0.25], [142, 52, 1.5, 0.30],
]

type Phase = 'done' | 'intro' | 'coachmark'

function measureTarget(selector: string): DOMRect | null {
  const el = document.querySelector(selector)
  return el ? el.getBoundingClientRect() : null
}

function isFullscreen(rect: DOMRect | null): boolean {
  if (!rect) return false
  return rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8
}

function tooltipStyle(rect: DOMRect | null, estHeight: number = TOOLTIP_H): React.CSSProperties {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }

  if (isFullscreen(rect)) {
    return { top: `${88}px`, left: `${20}px` }
  }

  const vpW = window.innerWidth
  const vpH = window.innerHeight

  // A target hugging the horizontal center (e.g. the top search bar) has no
  // side "facing the center" — put the card below it (or above, for a
  // bottom-half target) instead, centered on the target.
  const centerX = rect.left + rect.width / 2
  if (Math.abs(centerX - vpW / 2) < vpW / 6) {
    const left = Math.max(8, Math.min(centerX - TOOLTIP_W / 2, vpW - TOOLTIP_W - 8))
    if (rect.top + rect.height / 2 <= vpH / 2) {
      return { top: `${Math.min(rect.bottom + GAP, vpH - estHeight - 8)}px`, left: `${left}px` }
    }
    return { bottom: `${Math.max(8, vpH - rect.top + GAP)}px`, left: `${left}px` }
  }

  // Beside the target (never above/below), on the side facing the screen
  // center, so the card leans into the map rather than the screen edge.
  const preferRight = centerX <= vpW / 2
  const fitsRight = rect.right + GAP + TOOLTIP_W <= vpW - 8
  const fitsLeft = rect.left - GAP - TOOLTIP_W >= 8
  const side = preferRight ? (fitsRight ? 'right' : 'left') : (fitsLeft ? 'left' : 'right')
  const left = side === 'right'
    ? Math.min(rect.right + GAP, vpW - TOOLTIP_W - 8)
    : Math.max(8, rect.left - GAP - TOOLTIP_W)

  // Vertical nudge toward the center: a target in the top half anchors the
  // card to its top edge and flows down; a bottom-half target anchors to its
  // bottom edge and flows up (e.g. a bottom-left target gets the card at its
  // top-right). Anchoring via `bottom` keeps the card's growth pointed at the
  // center regardless of how many lines the content wraps to.
  if (rect.top + rect.height / 2 <= vpH / 2) {
    return { top: `${Math.min(Math.max(8, rect.top), vpH - estHeight - 8)}px`, left: `${left}px` }
  }
  return { bottom: `${Math.max(8, vpH - rect.bottom)}px`, left: `${left}px` }
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full border transition-colors ${
            i <= current
              ? 'bg-accent border-accent'
              : 'bg-transparent border-graticule/60'
          }`}
        />
      ))}
    </div>
  )
}

function CoachmarkCloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-2.5 right-2.5 text-starlight/40 hover:text-starlight/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
      aria-label="Skip tour"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function CoachmarkFooter({
  step,
  total,
  isLast,
  onAdvance,
}: {
  step: number
  total: number
  isLast: boolean
  onAdvance: () => void
}) {
  return (
    <div className="flex items-center justify-between pt-1">
      <StepDots current={step} total={total} />
      <button
        onClick={onAdvance}
        className="w-7 h-7 rounded-full bg-accent-deep hover:bg-accent-deep/90 flex items-center justify-center transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        aria-label={isLast ? 'Finish tour' : 'Next step'}
      >
        {isLast
          ? <Check className="w-3.5 h-3.5 text-starlight" strokeWidth={2.5} />
          : <ArrowRight className="w-3.5 h-3.5 text-starlight" strokeWidth={2.5} />
        }
      </button>
    </div>
  )
}

export function OnboardingFlow() {
  const consentStatus = useConsentStore((s) => s.consentStatus)
  const {
    replayActive,
    setOnboardingStatus,
    setOnboardingSkippedAt,
    resetReplay,
  } = useOnboardingStore()

  const openGuide = useFieldGuideStore((s) => s.openGuide)

  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('done')
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (consentStatus === 'pending') return

    if (replayActive) {
      setPhase('intro')
      setStep(0)
      setOnboardingStatus('in_progress')
      resetReplay()
      return
    }

    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      const t = setTimeout(() => {
        setPhase('intro')
        setOnboardingStatus('in_progress')
      }, 600)
      return () => clearTimeout(t)
    }
  }, [consentStatus, replayActive, setOnboardingStatus, resetReplay])

  useEffect(() => {
    if (phase !== 'coachmark') return
    setRect(measureTarget(STEPS[step].selector))
  }, [phase, step])

  useEffect(() => {
    if (phase !== 'coachmark') return
    const onResize = () => setRect(measureTarget(STEPS[step].selector))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [phase, step])

  const handleSkip = useCallback((atStep?: number) => {
    const skipAt = atStep ?? (phase === 'coachmark' ? step : null)
    setOnboardingSkippedAt(skipAt)
    setOnboardingStatus('skipped')
    localStorage.setItem(STORAGE_KEY, 'skipped')
    setPhase('done')
  }, [phase, step, setOnboardingSkippedAt, setOnboardingStatus])

  const handleComplete = useCallback(() => {
    setOnboardingStatus('completed')
    localStorage.setItem(STORAGE_KEY, 'completed')
    setPhase('done')
  }, [setOnboardingStatus])

  useEffect(() => {
    if (phase === 'done') return
    const onKey = (e: KeyboardEvent) => {
      // When the field guide is open on top of the tour, Escape belongs to
      // the guide — don't also skip the tutorial underneath.
      if (e.key === 'Escape' && !useFieldGuideStore.getState().isOpen) handleSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, handleSkip])

  if (!mounted || phase === 'done') return null

  // ── Intro modal ──────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return createPortal(
      <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-ink/85 p-4">
        <div className="relative bg-chart border border-graticule/40 rounded-sm p-6 w-full max-w-md shadow-2xl">
          <CornerTicks />
          <button
            onClick={() => handleSkip()}
            className="absolute top-3 right-3 text-starlight/40 hover:text-starlight/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
            aria-label="Skip tour"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <svg
            aria-hidden
            viewBox="0 0 200 80"
            width={200}
            height={80}
            className="mx-auto mb-5 block"
          >
            {SCATTER_DOTS.map(([cx, cy, r, opacity], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="#9DB2D6" opacity={opacity} />
            ))}
          </svg>

          <h2 className="font-wordmark text-xl font-bold mb-4"><span className="text-accent">Neuron</span><span className="text-alert">dle</span></h2>
          <div className="space-y-3 mb-6">
            <p className="text-sm text-starlight/80 leading-relaxed">
              An AI&rsquo;s raw parts are tangled. Researchers untangled them into thousands of &ldquo;neurons&rdquo;, each tending to respond to one concept. You&rsquo;ll see one per round. Identify the concept, then place a pin to guess on its location on the map.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleSkip()}
              className="text-sm text-starlight/40 hover:text-starlight/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
            >
              Skip
            </button>
            <button
              onClick={() => { setPhase('coachmark'); setStep(0) }}
              className="px-4 py-2 bg-accent-deep hover:bg-accent-deep/90 text-starlight text-sm font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              Start
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // ── Step 0: map overview — centered card, vignette only, no spotlight ────────
  if (step === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[10001] pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative bg-chart border border-graticule/40 rounded-sm shadow-2xl pointer-events-auto"
            style={{ width: 340 }}
            onClick={(e) => e.stopPropagation()}
          >
            <CornerTicks />
            <CoachmarkCloseBtn onClick={() => handleSkip(step)} />

            <div className="px-3 pt-2.5 pb-2.5 space-y-2">
              <p className="text-base font-bold text-starlight leading-snug pr-6">The map</p>

              <p className="text-sm text-starlight/80 leading-relaxed">
                Every dot is one neuron. On this map there are 16,384 of them, read from one layer of{' '}
                <button
                  onClick={() => openGuide('what-youre-looking-at')}
                  className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
                >
                  a real AI
                </button>
                . Nearby dots tend to respond to similar things.
              </p>

              <div className="flex gap-3 pt-0.5">
                <div className="flex flex-col items-center gap-1.5 border border-graticule/40 rounded py-3 flex-1">
                  <Mouse className="w-4 h-4 text-starlight/60" />
                  <span className="text-xs text-starlight/60">Scroll to zoom</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 border border-graticule/40 rounded py-3 flex-1">
                  <Hand className="w-4 h-4 text-starlight/60" />
                  <span className="text-xs text-starlight/60">Drag to pan</span>
                </div>
              </div>

              <CoachmarkFooter
                step={0}
                total={STEPS.length}
                isLast={false}
                onAdvance={() => setStep(1)}
              />
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // ── Steps 1–4: anchored tooltip with spotlight ────────────────────────────
  const isLast = step === STEPS.length - 1
  // Step 1 (Hints) renders two paragraphs and runs taller than the default estimate.
  const estTooltipHeight = step === 1 ? 260 : TOOLTIP_H
  const cardStyle = tooltipStyle(rect, estTooltipHeight)

  return createPortal(
    <div className="fixed inset-0 z-[10001] pointer-events-auto">

      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
        aria-hidden
      >
        <defs>
          <mask id="onboarding-spotlight">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && !isFullscreen(rect) && (
              <rect
                x={rect.left - 8}
                y={rect.top - 8}
                width={rect.width + 16}
                height={rect.height + 16}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {isFullscreen(rect)
          ? <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.35)" />
          : <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#onboarding-spotlight)" />
        }
      </svg>

      <div
        className="bg-chart border border-graticule/40 rounded-sm shadow-2xl"
        style={{ position: 'absolute', width: TOOLTIP_W, ...cardStyle, pointerEvents: 'all' }}
        onClick={(e) => e.stopPropagation()}
      >
        <CornerTicks />
        <CoachmarkCloseBtn onClick={() => handleSkip(step)} />

        <div className="px-3 pt-2.5 pb-2.5 space-y-2">
          <p className="text-base font-bold text-starlight leading-snug pr-6">{STEPS[step].title}</p>

          {step === 1 ? (
            <div className="space-y-2">
              <p className="text-sm text-starlight/80 leading-relaxed">
                Highlighted words are where the neuron activated in real text. Each one is a clue to the concept.
              </p>
              <p className="text-sm text-starlight/80 leading-relaxed">
                Use hints to get more highlighted words.
              </p>
            </div>
          ) : (
            <p className="text-sm text-starlight/80 leading-relaxed">{STEPS[step].body}</p>
          )}

          <CoachmarkFooter
            step={step}
            total={STEPS.length}
            isLast={isLast}
            onAdvance={isLast ? handleComplete : () => setStep(s => s + 1)}
          />
        </div>
      </div>

    </div>,
    document.body
  )
}
