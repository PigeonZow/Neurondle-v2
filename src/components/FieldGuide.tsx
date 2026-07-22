'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { CornerTicks } from '@/components/ui/CornerTicks'
import { useFieldGuideStore, type GuideSectionId } from '@/lib/store/fieldGuideStore'

// Placeholder copy — layout stand-ins only, real text comes later.
const L1 =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
const L2 =
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
const L3 =
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
const L4 =
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'

interface GuideSection {
  id: GuideSectionId
  num: string
  title: string
  lay: string
  deep: string[]
}

const SECTIONS: GuideSection[] = [
  {
    id: 'what-youre-looking-at',
    num: '01',
    title: 'Where this data comes from',
    lay: `${L1} ${L2}`,
    deep: [`${L3} ${L4}`, `${L2} ${L1}`],
  },
  {
    id: 'neurons-and-features',
    num: '02',
    title: 'What is a "neuron"?',
    lay: `${L3} ${L1}`,
    deep: [`${L2} ${L4} ${L3}`, L1],
  },
  {
    id: 'sparse-autoencoders',
    num: '03',
    title: 'Sparse autoencoders',
    lay: `${L4} ${L2}`,
    deep: [`${L1} ${L3}`, `${L4} ${L2}`],
  },
  {
    id: 'activations',
    num: '04',
    title: 'Activation numbers',
    lay: `${L2} ${L3}`,
    deep: [`${L4} ${L1} ${L2}`, L3],
  },
  {
    id: 'the-map',
    num: '05',
    title: 'The map',
    lay: `${L1} ${L4}`,
    deep: [`${L3} ${L2}`],
  },
  {
    id: 'why-neurondle',
    num: '06',
    title: 'Why this game exists',
    lay: `${L2} ${L4} ${L1}`,
    deep: [`${L3} ${L1}`, `${L2} ${L4}`],
  },
]

function Section({ section }: { section: GuideSection }) {
  const [open, setOpen] = useState(false)

  return (
    <section id={`fg-${section.id}`} className="scroll-mt-4">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-starlight/45">
          {section.num}
        </span>
        <h3 className="text-base font-semibold text-starlight">{section.title}</h3>
      </div>

      <p className="text-sm text-starlight/80 leading-relaxed">{section.lay}</p>

      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="mt-2 flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-accent/80 hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
      >
        <ChevronRight
          className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
        />
        Go deeper
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 bg-ink/60 border-l-2 border-accent/40 rounded-r px-4 py-3 space-y-2.5">
              {section.deep.map((p, i) => (
                <p key={i} className="text-sm text-starlight/70 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export function FieldGuide() {
  const { isOpen, section, closeGuide } = useFieldGuideStore()
  const bodyRef = useRef<HTMLDivElement>(null)

  // Scroll the requested section into view when the overlay opens.
  useEffect(() => {
    if (!isOpen) return
    requestAnimationFrame(() => {
      if (!section) {
        bodyRef.current?.scrollTo({ top: 0 })
        return
      }
      bodyRef.current
        ?.querySelector(`#fg-${section}`)
        ?.scrollIntoView({ block: 'start' })
    })
  }, [isOpen, section])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGuide()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeGuide])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="field-guide-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closeGuide}
          className="fixed inset-0 z-[9990] flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-full max-w-2xl max-h-[86vh] bg-chart border border-graticule/40 rounded-sm shadow-2xl overflow-hidden"
          >
            <CornerTicks />

            {/* Header */}
            <div className="flex-shrink-0 flex items-start justify-between px-6 pt-5 pb-4 border-b border-graticule/25">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-starlight/45 mb-1">
                  Neurondle
                </p>
                <h2 className="text-xl font-bold text-starlight">What is this?</h2>
              </div>
              <button
                onClick={closeGuide}
                aria-label="Close field guide"
                className="mt-0.5 text-starlight/40 hover:text-starlight/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-7">
                {SECTIONS.map(s => (
                  <Section key={s.id} section={s} />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
