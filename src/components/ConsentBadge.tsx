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
      ? { label: 'Opted in', dot: 'bg-primary-400' }
      : consentStatus === 'declined'
        ? { label: 'Opted out', dot: 'bg-game-highlight' }
        : { label: 'Pending', dot: 'bg-gray-500' }

  // Show last 12 chars of session token — full ID is in the modal
  const shortId = token ? token.slice(-12) : '············'

  return (
    <button
      onClick={openModal}
      title="View research participation details"
      className="group fixed bottom-3 right-3 z-40 flex items-center gap-2 bg-game-surface/85 backdrop-blur-sm hover:bg-game-surface rounded-md pl-2 pr-2.5 py-1.5 ring-1 ring-white/5 hover:ring-white/10 transition-all pointer-events-auto shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-gray-200 group-hover:text-white transition-colors">
        Research · {status.label}
      </span>
      <span className="text-[10px] font-mono text-gray-400 group-hover:text-gray-200 transition-colors hidden sm:inline">
        {shortId}
      </span>
    </button>
  )
}
