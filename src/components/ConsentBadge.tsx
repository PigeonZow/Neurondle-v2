'use client'

import { useEffect, useState } from 'react'
import { useConsentStore } from '@/lib/store/consentStore'
import { getSessionToken } from '@/lib/services/sessions'

export function ConsentBadge() {
  const { consentStatus, isModalOpen, openModal } = useConsentStore()
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    setToken(getSessionToken())
  }, [])

  if (isModalOpen) return null

  const status =
    consentStatus === 'accepted'
      ? { label: 'Opted in', dot: 'bg-accent' }
      : consentStatus === 'declined'
        ? { label: 'Opted out', dot: 'bg-alert' }
        : { label: 'Pending', dot: 'bg-starlight/40' }

  // Show last 12 chars of session token — full ID is in the modal
  const shortId = token ? token.slice(-12) : '············'

  return (
    <button
      onClick={openModal}
      title="View research participation details"
      className="group fixed bottom-3 right-3 z-40 flex items-center gap-2 bg-chart/85 backdrop-blur-sm hover:bg-chart rounded pl-2 pr-2.5 py-1.5 ring-1 ring-graticule/40 hover:ring-graticule/60 transition-all pointer-events-auto shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-starlight/70 group-hover:text-starlight transition-colors">
        Research · {status.label}
      </span>
      <span className="text-[10px] font-mono text-starlight/50 group-hover:text-starlight/80 transition-colors hidden sm:inline">
        {shortId}
      </span>
    </button>
  )
}
