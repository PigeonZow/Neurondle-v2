'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TokenWithTooltipProps {
  token: string
  activation: number
  maxActivation: number
}

export function TokenWithTooltip({ token, activation, maxActivation }: TokenWithTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const opacity = Math.min(activation / maxActivation * 1.5 + 0.1, 1)

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({
      x: e.clientX + 12,
      y: e.clientY + 12,
    })
  }

  const tooltipElement = showTooltip && mounted ? createPortal(
    <div
      className="fixed z-[9999] bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white shadow-lg"
      style={{
        left: tooltipPos.x,
        top: tooltipPos.y,
      }}
    >
      Activation: {activation.toFixed(2)}
    </div>,
    document.body
  ) : null

  return (
    <>
      <span
        className="token cursor-default relative text-xs"
        style={{
          backgroundColor: `rgba(59, 130, 246, ${opacity})`,
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {token}
      </span>
      {tooltipElement}
    </>
  )
}
