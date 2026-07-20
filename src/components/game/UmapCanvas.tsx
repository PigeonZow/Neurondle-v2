'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { useConsentStore } from '@/lib/store/consentStore'
import { useOnboardingStore } from '@/lib/store/onboardingStore'
import type { UmapPoint } from '@/types'

interface UmapCanvasProps {
  data: UmapPoint[]
  highlightIndices?: Set<number>
  answerPoint?: { x: number; y: number } | null
  showAnswer?: boolean
  roundKey?: number
  onInspectPoint?: (point: UmapPoint) => void
}

export interface UmapCanvasRef {
  centerOnPoint: (point: { x: number; y: number }) => void
  setSearchHighlight: (point: { x: number; y: number } | null) => void
  showPointLabel: (point: UmapPoint | null) => void
  showProbeGlow: (results: { index: number; value: number }[]) => void
  clearProbeGlow: () => void
  pinAtPoint: (point: { x: number; y: number }) => void
  getScreenPos: (point: { x: number; y: number }) => { x: number; y: number } | null
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  point: UmapPoint | null
}

// Screen-px radius shared by the hover ring, tooltip lookup, and pin snap.
// Keeping them identical means the ring telegraphs exactly what a click
// will snap to; anything outside it places the pin freely.
const HOVER_RADIUS_PX = 20

// Simple spatial index for fast lookups
class SpatialIndex {
  private points: { point: UmapPoint; sx: number; sy: number }[] = []

  insert(point: UmapPoint, sx: number, sy: number) {
    this.points.push({ point, sx, sy })
  }

  findNearest(x: number, y: number, maxDist: number): UmapPoint | null {
    let nearest: UmapPoint | null = null
    let minDist = maxDist * maxDist

    for (const { point, sx, sy } of this.points) {
      const dx = sx - x
      const dy = sy - y
      const dist = dx * dx + dy * dy
      if (dist < minDist) {
        minDist = dist
        nearest = point
      }
    }

    return nearest
  }
}

export const UmapCanvas = forwardRef<UmapCanvasRef, UmapCanvasProps>(function UmapCanvas({
  data,
  highlightIndices,
  answerPoint,
  showAnswer = false,
  roundKey = 0,
  onInspectPoint,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pixiRef = useRef<{
    destroy: () => void
    getWorldCoords: (screenX: number, screenY: number) => { x: number; y: number } | null
    toScreen: (x: number, y: number) => { x: number; y: number }
    getZoom: () => number
    spatialIndex: SpatialIndex
    scale: number
    offsetX: number
    offsetY: number
    highlightPoints: (indices: Set<number>) => void
    showAnswerLine: (pin: { x: number; y: number }, answer: { x: number; y: number }) => void
    clearPinAndLine: () => void
    resetView: () => void
    zoomToFit: (pin: { x: number; y: number }, answer: { x: number; y: number }) => void
    centerOnPoint: (point: { x: number; y: number }) => void
    setSearchHighlight: (point: { x: number; y: number } | null) => void
    showProbeGlow: (results: { index: number; value: number }[]) => void
    clearProbeGlow: () => void
    pinAtPoint: (point: { x: number; y: number }) => void
  } | null>(null)

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    point: null,
  })

  // Tooltip shown programmatically (jump-to-match) rather than by hover. It
  // survives mouse movement over the header controls so repeated ‹ › clicks
  // don't dismiss it; hovering the map hands control back to normal hover.
  const stickyTooltipRef = useRef(false)
  const labelRafRef = useRef<number | null>(null)

  // The pixi closure is built once per init; mirror the prop into a ref so
  // the clicked handler always sees the latest callback
  const onInspectPointRef = useRef(onInspectPoint)
  useEffect(() => { onInspectPointRef.current = onInspectPoint })

  useImperativeHandle(ref, () => ({
    centerOnPoint: (point: { x: number; y: number }) => {
      pixiRef.current?.centerOnPoint(point)
    },
    setSearchHighlight: (point: { x: number; y: number } | null) => {
      pixiRef.current?.setSearchHighlight(point)
    },
    showProbeGlow: (results: { index: number; value: number }[]) => {
      pixiRef.current?.showProbeGlow(results)
    },
    clearProbeGlow: () => {
      pixiRef.current?.clearProbeGlow()
    },
    pinAtPoint: (point: { x: number; y: number }) => {
      pixiRef.current?.pinAtPoint(point)
    },
    getScreenPos: (point: { x: number; y: number }) => {
      return pixiRef.current ? pixiRef.current.toScreen(point.x, point.y) : null
    },
    showPointLabel: (point: UmapPoint | null) => {
      if (labelRafRef.current !== null) {
        window.cancelAnimationFrame(labelRafRef.current)
        labelRafRef.current = null
      }
      if (!point) {
        if (stickyTooltipRef.current) {
          stickyTooltipRef.current = false
          setTooltip(prev => ({ ...prev, visible: false }))
        }
        return
      }
      stickyTooltipRef.current = true
      // Show immediately and track the point while the camera pans to it
      // (centerOnPoint animates for 600ms), then settle
      const start = performance.now()
      const update = () => {
        if (!pixiRef.current || !stickyTooltipRef.current) return
        const pos = pixiRef.current.toScreen(point.x, point.y)
        setTooltip({ visible: true, x: pos.x, y: pos.y, point })
        labelRafRef.current = performance.now() - start < 700
          ? window.requestAnimationFrame(update)
          : null
      }
      update()
    },
  }), [])

  const consentStatus = useConsentStore(state => state.consentStatus)
  const onboardingStatus = useOnboardingStore(state => state.onboardingStatus)
  const onboardingInProgress = useRef(false)
  useEffect(() => {
    onboardingInProgress.current = onboardingStatus === 'in_progress'
  }, [onboardingStatus])

  const setPin = useGameStore(state => state.setPin)
  const currentPin = useGameStore(state => {
    const round = state.rounds[state.currentRound]
    return round?.pin || null
  })

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (onboardingInProgress.current) {
      setTooltip(prev => prev.visible ? { ...prev, visible: false } : prev)
      return
    }
    if (!pixiRef.current) return

    const target = e.target as HTMLElement
    const isOverControls = target.closest('.game-overlay') !== null

    if (isOverControls) {
      if (!stickyTooltipRef.current) {
        setTooltip(prev => ({ ...prev, visible: false }))
      }
      return
    }
    stickyTooltipRef.current = false

    const coords = pixiRef.current.getWorldCoords(e.clientX, e.clientY)
    if (!coords) return

    const { scale, offsetX, offsetY, spatialIndex } = pixiRef.current
    const screenX = coords.x * scale + offsetX
    const screenY = coords.y * scale + offsetY

    const searchDist = HOVER_RADIUS_PX / pixiRef.current.getZoom()
    const nearest = spatialIndex.findNearest(screenX, screenY, searchDist)

    if (nearest) {
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        point: nearest,
      })
    } else {
      setTooltip(prev => ({ ...prev, visible: false }))
    }
  }, [])

  useEffect(() => {
    if (!pixiRef.current || !showAnswer || !answerPoint || !currentPin) return
    pixiRef.current.showAnswerLine(currentPin, answerPoint)
    pixiRef.current.zoomToFit(currentPin, answerPoint)
  }, [showAnswer, answerPoint, currentPin])

  useEffect(() => {
    if (!pixiRef.current) return
    pixiRef.current.clearPinAndLine()
    pixiRef.current.clearProbeGlow()
    pixiRef.current.resetView()
  }, [roundKey])

  useEffect(() => {
    pixiRef.current?.highlightPoints(highlightIndices ?? new Set())
  }, [highlightIndices])

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    let destroyed = false

    async function initPixi() {
      const PIXI = await import('pixi.js')
      const { Viewport } = await import('pixi-viewport')

      if (destroyed) return

      // Capture container dimensions at init time so the UMAP scale/fit is
      // computed for the actual canvas area (viewport width minus right panel).
      const canvasW = window.innerWidth
      const canvasH = window.innerHeight

      const app = new PIXI.Application()
      await app.init({
        resizeTo: window,
        backgroundColor: 0x0a0d1a,
        antialias: true,
        resolution: window.devicePixelRatio,
        autoDensity: true,
      })

      if (destroyed) {
        app.destroy(true)
        return
      }

      containerRef.current?.appendChild(app.canvas)
      app.canvas.id = 'game-canvas'

      const xs = data.map(p => p.x)
      const ys = data.map(p => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const padding = 0
      const worldWidth = (maxX - minX) + padding * 2
      const worldHeight = (maxY - minY) + padding * 2

      const viewport = new Viewport({
        screenWidth: canvasW,
        screenHeight: canvasH,
        worldWidth,
        worldHeight,
        events: app.renderer.events,
      })

      viewport.drag().pinch().wheel().decelerate()
      app.stage.addChild(viewport)

      const scale = Math.min(
        (canvasW - 100) / (maxX - minX),
        (canvasH - 100) / (maxY - minY)
      ) * 0.8
      const offsetX = -minX * scale + padding
      const offsetY = -minY * scale + padding

      const contentWidth = (maxX - minX) * scale
      const contentHeight = (maxY - minY) * scale
      const fitScale = Math.min(
        canvasW / (contentWidth + padding * 2),
        canvasH / (contentHeight + padding * 2)
      ) * 0.9

      const resetView = () => {
        viewport.setZoom(fitScale, true)
        viewport.moveCenter(
          contentWidth / 2 + padding,
          contentHeight / 2 + padding
        )
      }

      const spatialIndex = new SpatialIndex()
      const pointsContainer = new PIXI.Container()
      const highlightContainer = new PIXI.Container()
      const overlayContainer = new PIXI.Container()

      const TEXTURE_RADIUS = 16
      const DISPLAY_RADIUS = 2.5
      const SPRITE_SCALE = DISPLAY_RADIUS / TEXTURE_RADIUS

      const baseGraphics = new PIXI.Graphics()
      baseGraphics.circle(0, 0, TEXTURE_RADIUS)
      baseGraphics.fill({ color: 0xffffff, alpha: 1 })
      const baseTexture = app.renderer.generateTexture(baseGraphics)

      const highlightGraphics = new PIXI.Graphics()
      highlightGraphics.circle(0, 0, TEXTURE_RADIUS * 1.5)
      highlightGraphics.fill({ color: 0xfbbf24, alpha: 0.9 })
      const highlightTexture = app.renderer.generateTexture(highlightGraphics)
      const HIGHLIGHT_SPRITE_SCALE = (DISPLAY_RADIUS * 1.5) / (TEXTURE_RADIUS * 1.5)

      // Probe glow: soft magenta halo — the only magenta on the map, chosen
      // for contrast against the blue dots (cyan disappeared into them).
      // ~3x dot radius, with per-sprite alpha encoding activation strength.
      const probeGraphics = new PIXI.Graphics()
      probeGraphics.circle(0, 0, TEXTURE_RADIUS * 3)
      probeGraphics.fill({ color: 0xd946ef, alpha: 0.35 })
      probeGraphics.circle(0, 0, TEXTURE_RADIUS * 2)
      probeGraphics.fill({ color: 0xd946ef, alpha: 0.5 })
      probeGraphics.circle(0, 0, TEXTURE_RADIUS * 1.2)
      probeGraphics.fill({ color: 0xe879f9, alpha: 0.9 })
      const probeTexture = app.renderer.generateTexture(probeGraphics)
      const PROBE_SPRITE_SCALE = DISPLAY_RADIUS / TEXTURE_RADIUS
      const probeSprites = new Map<number, any>()
      const probeContainer = new PIXI.Container()

      const spriteMap = new Map<number, any>()
      const highlightSprites = new Map<number, any>()

      data.forEach(point => {
        const sx = point.x * scale + offsetX
        const sy = point.y * scale + offsetY

        const sprite = new PIXI.Sprite(baseTexture)
        sprite.x = sx
        sprite.y = sy
        sprite.anchor.set(0.5)
        sprite.scale.set(SPRITE_SCALE)

        sprite.tint = 0x60a5fa

        pointsContainer.addChild(sprite)
        spriteMap.set(point.index, sprite)
        spatialIndex.insert(point, sx, sy)
      })

      viewport.addChild(pointsContainer)
      viewport.addChild(probeContainer)
      viewport.addChild(highlightContainer)
      viewport.addChild(overlayContainer)

      const hoverGraphics = new PIXI.Graphics()
      hoverGraphics.circle(0, 0, DISPLAY_RADIUS + 2)
      hoverGraphics.stroke({ color: 0xffffff, width: 2 })
      hoverGraphics.visible = false
      viewport.addChild(hoverGraphics)

      let pinSprite: any = null
      let answerSprite: any = null
      let answerLine: any = null
      // Persistent ring highlighting the most recently searched feature dot
      let searchHighlightSprite: any = null

      const updateScalesOnZoom = () => {
        const zoomScale = viewport.scaled
        const pointScale = SPRITE_SCALE / zoomScale
        const highlightScale = HIGHLIGHT_SPRITE_SCALE / zoomScale

        spriteMap.forEach(sprite => { sprite.scale.set(pointScale) })
        highlightSprites.forEach(sprite => { sprite.scale.set(highlightScale) })

        const probeScale = PROBE_SPRITE_SCALE / zoomScale
        probeSprites.forEach(sprite => { sprite.scale.set(probeScale) })

        if (pinSprite) pinSprite.scale.set(1 / zoomScale)
        if (answerSprite) answerSprite.scale.set(1 / zoomScale)
        if (searchHighlightSprite) searchHighlightSprite.scale.set(1 / zoomScale)

        hoverGraphics.scale.set(1 / zoomScale)
      }

      viewport.on('zoomed', updateScalesOnZoom)
      viewport.on('zoomed-end', updateScalesOnZoom)
      updateScalesOnZoom()

      // Shared by free-placement clicks and the inspector's "Select this neuron"
      const placePinAt = (umapX: number, umapY: number) => {
        const sx = umapX * scale + offsetX
        const sy = umapY * scale + offsetY

        // Store UMAP-space coordinates for game logic
        setPin({ x: umapX, y: umapY })

        // Clear search highlight once the player commits a pin
        if (searchHighlightSprite) {
          overlayContainer.removeChild(searchHighlightSprite)
          searchHighlightSprite.destroy()
          searchHighlightSprite = null
        }

        if (pinSprite) {
          pinSprite.x = sx
          pinSprite.y = sy
        } else {
          pinSprite = new PIXI.Graphics()
          pinSprite.circle(0, 0, 10)
          pinSprite.fill({ color: 0xfbbf24 })
          pinSprite.circle(0, 0, 5)
          pinSprite.fill({ color: 0xffffff })
          pinSprite.x = sx
          pinSprite.y = sy
          pinSprite.scale.set(1 / viewport.scaled)
          overlayContainer.addChild(pinSprite)
        }
      }

      viewport.on('clicked', (e) => {
        // A dot inside the hover ring opens the inspector (pinning it happens
        // via the inspector's button); empty space places the pin freely.
        const snapThreshold = HOVER_RADIUS_PX / viewport.scaled
        const nearest = spatialIndex.findNearest(e.world.x, e.world.y, snapThreshold)

        if (nearest) {
          if (onInspectPointRef.current) {
            onInspectPointRef.current(nearest)
          } else {
            placePinAt(nearest.x, nearest.y)
          }
          return
        }

        placePinAt((e.world.x - offsetX) / scale, (e.world.y - offsetY) / scale)
      })

      const onPointerMove = (e: any) => {
        const worldPos = viewport.toWorld(e.global)
        const searchDist = HOVER_RADIUS_PX / viewport.scaled
        const nearest = spatialIndex.findNearest(worldPos.x, worldPos.y, searchDist)

        if (nearest) {
          const sx = nearest.x * scale + offsetX
          const sy = nearest.y * scale + offsetY
          hoverGraphics.x = sx
          hoverGraphics.y = sy
          hoverGraphics.visible = true
        } else {
          hoverGraphics.visible = false
        }
      }

      viewport.on('pointermove', onPointerMove)

      resetView()

      pixiRef.current = {
        destroy: () => { app.destroy(true) },
        getWorldCoords: (screenX: number, screenY: number) => {
          const worldPos = viewport.toWorld({ x: screenX, y: screenY })
          return {
            x: (worldPos.x - offsetX) / scale,
            y: (worldPos.y - offsetY) / scale,
          }
        },
        toScreen: (x: number, y: number) => {
          const screenPos = viewport.toScreen({ x: x * scale + offsetX, y: y * scale + offsetY })
          return { x: screenPos.x, y: screenPos.y }
        },
        getZoom: () => viewport.scaled,
        spatialIndex,
        scale,
        offsetX,
        offsetY,
        highlightPoints: (indices: Set<number>) => {
          highlightSprites.forEach(sprite => {
            highlightContainer.removeChild(sprite)
            sprite.destroy()
          })
          highlightSprites.clear()

          spriteMap.forEach(sprite => {
            sprite.alpha = indices.size > 0 ? 0.35 : 1
          })

          const currentZoom = viewport.scaled
          const highlightScale = HIGHLIGHT_SPRITE_SCALE / currentZoom

          indices.forEach(index => {
            const point = data.find(p => p.index === index)
            if (!point) return

            const sx = point.x * scale + offsetX
            const sy = point.y * scale + offsetY

            const highlightSprite = new PIXI.Sprite(highlightTexture)
            highlightSprite.x = sx
            highlightSprite.y = sy
            highlightSprite.anchor.set(0.5)
            highlightSprite.scale.set(highlightScale)
            highlightContainer.addChild(highlightSprite)
            highlightSprites.set(index, highlightSprite)

            const originalSprite = spriteMap.get(index)
            if (originalSprite) originalSprite.alpha = 1
          })
        },
        showAnswerLine: (pin, answer) => {
          const pinSx = pin.x * scale + offsetX
          const pinSy = pin.y * scale + offsetY
          const ansSx = answer.x * scale + offsetX
          const ansSy = answer.y * scale + offsetY
          const currentZoom = viewport.scaled

          if (answerLine) {
            overlayContainer.removeChild(answerLine)
            answerLine.destroy()
          }
          answerLine = new PIXI.Graphics()

          const dx = ansSx - pinSx
          const dy = ansSy - pinSy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const dashLength = 10
          const gapLength = 8
          const numDashes = Math.floor(dist / (dashLength + gapLength))

          answerLine.setStrokeStyle({ color: 0xffffff, width: 2, alpha: 0.8 })
          for (let i = 0; i < numDashes; i++) {
            const startT = (i * (dashLength + gapLength)) / dist
            const endT = (i * (dashLength + gapLength) + dashLength) / dist
            answerLine.moveTo(pinSx + dx * startT, pinSy + dy * startT)
            answerLine.lineTo(pinSx + dx * endT, pinSy + dy * endT)
          }
          answerLine.stroke()
          overlayContainer.addChild(answerLine)

          if (answerSprite) {
            overlayContainer.removeChild(answerSprite)
            answerSprite.destroy()
          }
          answerSprite = new PIXI.Graphics()
          answerSprite.circle(0, 0, 12)
          answerSprite.fill({ color: 0x22c55e })
          answerSprite.circle(0, 0, 6)
          answerSprite.fill({ color: 0xffffff })
          answerSprite.x = ansSx
          answerSprite.y = ansSy
          answerSprite.scale.set(1 / currentZoom)
          overlayContainer.addChild(answerSprite)

          if (pinSprite) pinSprite.scale.set(1 / currentZoom)
        },
        clearPinAndLine: () => {
          if (pinSprite) {
            overlayContainer.removeChild(pinSprite)
            pinSprite.destroy()
            pinSprite = null
          }
          if (answerSprite) {
            overlayContainer.removeChild(answerSprite)
            answerSprite.destroy()
            answerSprite = null
          }
          if (answerLine) {
            overlayContainer.removeChild(answerLine)
            answerLine.destroy()
            answerLine = null
          }
          if (searchHighlightSprite) {
            overlayContainer.removeChild(searchHighlightSprite)
            searchHighlightSprite.destroy()
            searchHighlightSprite = null
          }
        },
        resetView,
        zoomToFit: (pin, answer) => {
          const pinSx = pin.x * scale + offsetX
          const pinSy = pin.y * scale + offsetY
          const ansSx = answer.x * scale + offsetX
          const ansSy = answer.y * scale + offsetY

          const minX = Math.min(pinSx, ansSx)
          const maxX = Math.max(pinSx, ansSx)
          const minY = Math.min(pinSy, ansSy)
          const maxY = Math.max(pinSy, ansSy)

          const boxWidth = maxX - minX
          const boxHeight = maxY - minY
          const centerX = (minX + maxX) / 2
          const centerY = (minY + maxY) / 2

          const paddingFactor = 0.3
          const targetZoomX = canvasW / (boxWidth * (1 + paddingFactor * 2))
          const targetZoomY = canvasH / (boxHeight * (1 + paddingFactor * 2))
          const targetZoom = Math.min(targetZoomX, targetZoomY, 2)

          viewport.animate({
            position: { x: centerX, y: centerY },
            scale: targetZoom,
            time: 500,
            ease: 'easeInOutSine',
          })
        },
        centerOnPoint: (point) => {
          const sx = point.x * scale + offsetX
          const sy = point.y * scale + offsetY
          // "Search reveal" zoom = 2× the default fit zoom. If the player is
          // already zoomed in further than this, just pan — don't zoom out.
          const searchRevealZoom = fitScale * 2
          const targetScale = Math.max(viewport.scaled, searchRevealZoom)
          viewport.animate({
            position: { x: sx, y: sy },
            scale: targetScale,
            time: 600,
            ease: 'easeInOutSine',
          })
        },
        pinAtPoint: (point: { x: number; y: number }) => placePinAt(point.x, point.y),
        showProbeGlow: (results: { index: number; value: number }[]) => {
          probeSprites.forEach(sprite => {
            probeContainer.removeChild(sprite)
            sprite.destroy()
          })
          probeSprites.clear()

          const top = results[0]?.value || 1
          const probeScale = PROBE_SPRITE_SCALE / viewport.scaled

          results.forEach(({ index, value }) => {
            const point = data.find(p => p.index === index)
            if (!point) return
            const sprite = new PIXI.Sprite(probeTexture)
            sprite.x = point.x * scale + offsetX
            sprite.y = point.y * scale + offsetY
            sprite.anchor.set(0.5)
            sprite.scale.set(probeScale)
            sprite.alpha = 0.25 + 0.75 * (value / top)
            probeContainer.addChild(sprite)
            probeSprites.set(index, sprite)
          })
        },
        clearProbeGlow: () => {
          probeSprites.forEach(sprite => {
            probeContainer.removeChild(sprite)
            sprite.destroy()
          })
          probeSprites.clear()
        },
        setSearchHighlight: (point) => {
          // Remove previous ring
          if (searchHighlightSprite) {
            overlayContainer.removeChild(searchHighlightSprite)
            searchHighlightSprite.destroy()
            searchHighlightSprite = null
          }
          if (!point) return

          const sx = point.x * scale + offsetX
          const sy = point.y * scale + offsetY

          // Accent-colored ring sized to stand out against both the dot and background.
          // Uses the same fixed-screen-size pattern as pinSprite / answerSprite.
          searchHighlightSprite = new PIXI.Graphics()
          searchHighlightSprite.circle(0, 0, 10)
          searchHighlightSprite.stroke({ color: 0xe94560, width: 2.5 })
          searchHighlightSprite.x = sx
          searchHighlightSprite.y = sy
          searchHighlightSprite.scale.set(1 / viewport.scaled)
          overlayContainer.addChild(searchHighlightSprite)
        },
      }

      window.addEventListener('mousemove', handleMouseMove)
    }

    initPixi()

    return () => {
      destroyed = true
      window.removeEventListener('mousemove', handleMouseMove)
      if (pixiRef.current) {
        pixiRef.current.destroy()
        pixiRef.current = null
      }
    }
  }, [data, setPin, handleMouseMove])

  return (
    <>
      <div ref={containerRef} className="fixed inset-0" data-onboarding="umap-canvas" />

      {onboardingStatus === 'in_progress' && (
        <div className="fixed inset-0" style={{ zIndex: 1 }} />
      )}

      {/* Map dot hover tooltip — positioned above-right of cursor so the dot stays visible */}
      {tooltip.visible && tooltip.point && consentStatus !== 'pending' && onboardingStatus !== 'in_progress' && (
        <div
          className="fixed z-50 pointer-events-none bg-game-surface border border-gray-700 rounded-lg px-3 py-2 shadow-xl max-w-xs"
          style={{
            left: tooltip.x + 15,
            // Show above cursor by default; flip below only when near the top edge of the screen
            top: tooltip.y > 80 ? tooltip.y - 76 : tooltip.y + 22,
            transform: tooltip.x > window.innerWidth - 200 ? 'translateX(-100%)' : undefined,
          }}
        >
          <p className="text-xs text-gray-400 mb-1">Feature #{tooltip.point.index}</p>
          <p className="text-sm text-white">
            {tooltip.point.description || 'No description available'}
          </p>
        </div>
      )}
    </>
  )
})

function interpolateColor(color1: number, color2: number, t: number): number {
  const r1 = (color1 >> 16) & 0xff
  const g1 = (color1 >> 8) & 0xff
  const b1 = color1 & 0xff

  const r2 = (color2 >> 16) & 0xff
  const g2 = (color2 >> 8) & 0xff
  const b2 = color2 & 0xff

  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)

  return (r << 16) | (g << 8) | b
}
