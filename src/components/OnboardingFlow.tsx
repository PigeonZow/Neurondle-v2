'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useConsentStore } from '@/lib/store/consentStore'
import { useOnboardingStore } from '@/lib/store/onboardingStore'

const STORAGE_KEY = 'neurondle-onboarding-v1'
const TOOLTIP_W = 320
const TOOLTIP_H = 210
const GAP = 16

const STEPS = [
  {
    selector: '[data-onboarding="umap-canvas"]',
    body: 'This is the map. Each dot is a feature. Scroll to zoom, drag to pan.',
  },
  {
    selector: '[data-onboarding="hint-panel"]',
    body: "This is your mystery feature. Click 'Reveal Next' for example text showing where it activates. Fewer hints = higher score.",
  },
  {
    selector: '[data-onboarding="activation-input"]',
    body: 'Have a hypothesis? Type a sentence here to test whether the feature activates on it.',
  },
  {
    selector: '[data-onboarding="feature-search"]',
    body: 'Search the map by concept, or click anywhere on the map to drop your pin.',
  },
  {
    selector: '[data-onboarding="lock-in-button"]',
    body: 'Lock in your guess when ready. Good luck.',
  },
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

function tooltipStyle(rect: DOMRect | null): React.CSSProperties {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }

  if (isFullscreen(rect)) {
    // UMAP canvas covers whole screen — anchor tooltip below the game header
    return { top: `${88}px`, left: `${20}px` }
  }

  const vpW = window.innerWidth
  const spaceAbove = rect.top

  const top = spaceAbove >= TOOLTIP_H + GAP
    ? rect.top - TOOLTIP_H - GAP
    : rect.bottom + GAP

  const left = Math.max(8, Math.min(rect.left, vpW - TOOLTIP_W - 8))

  return { top: `${Math.max(8, top)}px`, left: `${left}px` }
}

export function OnboardingFlow() {
  const consentStatus = useConsentStore((s) => s.consentStatus)
  const {
    replayActive,
    setOnboardingStatus,
    setOnboardingSkippedAt,
    resetReplay,
  } = useOnboardingStore()

  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('done')
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Start the flow on first visit or replay
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

  // Measure target element whenever step or phase changes
  useEffect(() => {
    if (phase !== 'coachmark') return
    setRect(measureTarget(STEPS[step].selector))
  }, [phase, step])

  // Re-measure on resize
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

  // Escape skips
  useEffect(() => {
    if (phase === 'done') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleSkip() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, handleSkip])

  if (!mounted || phase === 'done') return null

  // ── Intro modal ──────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return createPortal(
      <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4">
        <div className="relative bg-[#16213e] border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
          <button
            onClick={() => handleSkip()}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Skip tour"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-xl font-bold text-white mb-3">Welcome to Neurondle</h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-6">
            AI models contain thousands of &lsquo;features&rsquo; — internal concepts they&rsquo;ve
            learned, like &lsquo;mentions of Paris&rsquo; or &lsquo;scientific writing.&rsquo; You&rsquo;ll be shown
            one mystery feature&rsquo;s behavior. Figure out what concept it represents,
            then drop a pin where you think it lives on the map. Closer pin = higher
            score.
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleSkip()}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={() => { setPhase('coachmark'); setStep(0) }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Start tour
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // ── Coachmark overlay ────────────────────────────────────────────────────────
  const full = isFullscreen(rect)
  const isLast = step === STEPS.length - 1
  const cardStyle = tooltipStyle(rect)

  return createPortal(
    // Outer container captures all pointer events — game is fully blocked
    <div className="fixed inset-0 z-[10001] pointer-events-auto">

      {/* SVG dim with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
        aria-hidden
      >
        <defs>
          <mask id="onboarding-spotlight">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && !full && (
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
        {/* Full-screen step: light veil so the map is still legible */}
        {full
          ? <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.35)" />
          : <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#onboarding-spotlight)" />
        }
      </svg>

      {/* Tooltip card */}
      <div
        className="absolute bg-[#16213e] border border-gray-700 rounded-xl shadow-2xl"
        style={{ width: TOOLTIP_W, ...cardStyle, pointerEvents: 'all' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">{step + 1} / {STEPS.length}</span>
            <button
              onClick={() => handleSkip(step)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Skip tour
            </button>
          </div>

          <p className="text-sm text-gray-200 leading-relaxed">
            {STEPS[step].body}
          </p>

          <div className="flex items-center justify-between pt-1">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
            ) : (
              // Invisible placeholder to keep Next button right-aligned
              <span className="w-[60px]" />
            )}
            <button
              onClick={isLast ? handleComplete : () => setStep(s => s + 1)}
              className="text-sm px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>

    </div>,
    document.body
  )
}
