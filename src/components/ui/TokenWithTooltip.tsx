'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface TokenWithTooltipProps {
  token: string
  activation: number
  maxActivation: number
}

const TOOLTIP_HEIGHT = 30  // px, approximate rendered height
const GAP = 8

export function TokenWithTooltip({ token, activation, maxActivation }: TokenWithTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const opacity = Math.min(Math.pow(activation / maxActivation, 1.6) + 0.05, 1)

  const displayToken = token.replace(/^[_▁]/, '')

  const handleMouseEnter = () => {
    if (!spanRef.current) return
    const rect = spanRef.current.getBoundingClientRect()

    // Prefer above unless token is in the top third of the viewport
    const preferBelow = rect.top < window.innerHeight / 3

    const top = preferBelow
      ? rect.bottom + GAP
      : rect.top - TOOLTIP_HEIGHT - GAP

    // Center horizontally over the token
    const left = rect.left + rect.width / 2

    setTooltipPos({ x: left, y: top })
    setShowTooltip(true)
  }

  const tooltipElement = showTooltip && mounted ? createPortal(
    <div
      className="fixed z-[9999] bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs shadow-lg pointer-events-none whitespace-nowrap"
      style={{
        left: tooltipPos.x,
        top: tooltipPos.y,
        transform: 'translateX(-50%)',
      }}
    >
      <span className="text-gray-300">Activation </span><span className="text-game-highlight font-medium">{activation.toFixed(2)}</span>
    </div>,
    document.body
  ) : null

  return (
    <>
      <span
        ref={spanRef}
        className="token cursor-default relative text-xs"
        style={{ backgroundColor: `rgba(233, 69, 96, ${opacity})` }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {displayToken}
      </span>
      {tooltipElement}
    </>
  )
}
