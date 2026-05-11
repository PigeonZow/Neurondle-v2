'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import type { UmapPoint } from '@/types'

interface UmapCanvasProps {
  data: UmapPoint[]
  searchQuery?: string
  answerPoint?: { x: number; y: number } | null
  showAnswer?: boolean
  roundKey?: number
}

export interface UmapCanvasRef {
  centerOnPoint: (point: { x: number; y: number }) => void
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  point: UmapPoint | null
}

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
  searchQuery = '',
  answerPoint,
  showAnswer = false,
  roundKey = 0,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pixiRef = useRef<{
    destroy: () => void
    getWorldCoords: (screenX: number, screenY: number) => { x: number; y: number } | null
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
  } | null>(null)

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    point: null,
  })

  // Expose centerOnPoint to parent via ref
  useImperativeHandle(ref, () => ({
    centerOnPoint: (point: { x: number; y: number }) => {
      pixiRef.current?.centerOnPoint(point)
    },
  }), [])

  const setPin = useGameStore(state => state.setPin)
  const currentPin = useGameStore(state => {
    const round = state.rounds[state.currentRound]
    return round?.pin || null
  })

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!pixiRef.current) return

    // Check if mouse is over the game controls panel (bottom area)
    const target = e.target as HTMLElement
    const isOverControls = target.closest('.game-overlay') !== null

    if (isOverControls) {
      setTooltip(prev => ({ ...prev, visible: false }))
      return
    }

    const coords = pixiRef.current.getWorldCoords(e.clientX, e.clientY)
    if (!coords) return

    const { scale, offsetX, offsetY, spatialIndex } = pixiRef.current
    const screenX = coords.x * scale + offsetX
    const screenY = coords.y * scale + offsetY

    const searchDist = 20 / pixiRef.current.getZoom()
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

  // Show answer line when revealed and zoom to fit both points
  useEffect(() => {
    if (!pixiRef.current || !showAnswer || !answerPoint || !currentPin) return
    pixiRef.current.showAnswerLine(currentPin, answerPoint)
    // Zoom to fit the line from pin to answer
    pixiRef.current.zoomToFit(currentPin, answerPoint)
  }, [showAnswer, answerPoint, currentPin])

  // Reset view when round changes
  useEffect(() => {
    if (!pixiRef.current) return
    pixiRef.current.clearPinAndLine()
    pixiRef.current.resetView()
  }, [roundKey])

  // Search/highlight effect
  useEffect(() => {
    if (!pixiRef.current || !searchQuery) {
      pixiRef.current?.highlightPoints(new Set())
      return
    }

    const query = searchQuery.toLowerCase()
    const matchingIndices = new Set<number>()

    data.forEach((point) => {
      if (point.description?.toLowerCase().includes(query)) {
        matchingIndices.add(point.index)
      }
    })

    pixiRef.current.highlightPoints(matchingIndices)
  }, [searchQuery, data])

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    let destroyed = false

    async function initPixi() {
      const PIXI = await import('pixi.js')
      const { Viewport } = await import('pixi-viewport')

      if (destroyed) return

      const app = new PIXI.Application()
      await app.init({
        resizeTo: window,
        backgroundColor: 0x1a1a2e,
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

      // Calculate bounds
      const xs = data.map(p => p.x)
      const ys = data.map(p => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const padding = 0
      const worldWidth = (maxX - minX) + padding * 2
      const worldHeight = (maxY - minY) + padding * 2

      // Create viewport
      const viewport = new Viewport({
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        worldWidth,
        worldHeight,
        events: app.renderer.events,
      })

      viewport.drag().pinch().wheel().decelerate()
      app.stage.addChild(viewport)

      // Scale and offset for UMAP coordinates -> screen coordinates
      const scale = Math.min(
        (window.innerWidth - 100) / (maxX - minX),
        (window.innerHeight - 100) / (maxY - minY)
      ) * 0.8
      const offsetX = -minX * scale + padding
      const offsetY = -minY * scale + padding

      // Calculate initial fit
      const contentWidth = (maxX - minX) * scale
      const contentHeight = (maxY - minY) * scale
      const fitScale = Math.min(
        window.innerWidth / (contentWidth + padding * 2),
        window.innerHeight / (contentHeight + padding * 2)
      ) * 0.9

      // Function to reset view
      const resetView = () => {
        viewport.setZoom(fitScale, true)
        viewport.moveCenter(
          contentWidth / 2 + padding,
          contentHeight / 2 + padding
        )
      }

      // Build spatial index and create point graphics
      const spatialIndex = new SpatialIndex()
      const pointsContainer = new PIXI.Container()
      const highlightContainer = new PIXI.Container()
      const overlayContainer = new PIXI.Container()

      // High-resolution texture size for crisp rendering when zoomed in
      // We create large textures and scale down the sprites
      const TEXTURE_RADIUS = 16  // High-res texture
      const DISPLAY_RADIUS = 2   // Displayed size in world units
      const SPRITE_SCALE = DISPLAY_RADIUS / TEXTURE_RADIUS

      // Create high-res base point texture
      const baseGraphics = new PIXI.Graphics()
      baseGraphics.circle(0, 0, TEXTURE_RADIUS)
      baseGraphics.fill({ color: 0x3b82f6, alpha: 0.8 })
      const baseTexture = app.renderer.generateTexture(baseGraphics)

      // Create high-res highlight texture - slightly bigger than base
      const highlightGraphics = new PIXI.Graphics()
      highlightGraphics.circle(0, 0, TEXTURE_RADIUS * 1.5)
      highlightGraphics.fill({ color: 0xfbbf24, alpha: 0.9 })
      const highlightTexture = app.renderer.generateTexture(highlightGraphics)
      const HIGHLIGHT_SPRITE_SCALE = (DISPLAY_RADIUS * 1.5) / (TEXTURE_RADIUS * 1.5)

      // Map to store sprites by index for highlighting
      const spriteMap = new Map<number, any>()
      const highlightSprites = new Map<number, any>()

      // Create sprites for each point
      data.forEach(point => {
        const sx = point.x * scale + offsetX
        const sy = point.y * scale + offsetY

        const sprite = new PIXI.Sprite(baseTexture)
        sprite.x = sx
        sprite.y = sy
        sprite.anchor.set(0.5)
        sprite.scale.set(SPRITE_SCALE)  // Scale down high-res texture

        // Color by sparsity
        if (point.sparsity !== undefined) {
          const normalized = Math.min(Math.max((point.sparsity + 6) / 6, 0), 1)
          sprite.tint = interpolateColor(0x3b82f6, 0xe94560, normalized)
        }

        pointsContainer.addChild(sprite)
        spriteMap.set(point.index, sprite)

        // Add to spatial index
        spatialIndex.insert(point, sx, sy)
      })

      viewport.addChild(pointsContainer)
      viewport.addChild(highlightContainer)
      viewport.addChild(overlayContainer)

      // Hover indicator - matches point size (scales with zoom)
      const hoverGraphics = new PIXI.Graphics()
      hoverGraphics.circle(0, 0, DISPLAY_RADIUS + 2)
      hoverGraphics.stroke({ color: 0xffffff, width: 2 })
      hoverGraphics.visible = false
      viewport.addChild(hoverGraphics)

      // Pin sprite
      let pinSprite: any = null
      // Answer marker
      let answerSprite: any = null
      // Line between pin and answer
      let answerLine: any = null

      // Update scales when zoom changes - keep points constant screen size
      const updateScalesOnZoom = () => {
        const zoomScale = viewport.scaled
        const pointScale = SPRITE_SCALE / zoomScale
        const highlightScale = HIGHLIGHT_SPRITE_SCALE / zoomScale

        // Update all point sprites to stay constant screen size
        spriteMap.forEach(sprite => {
          sprite.scale.set(pointScale)
        })

        // Update highlight sprites
        highlightSprites.forEach(sprite => {
          sprite.scale.set(highlightScale)
        })

        // Pin stays fixed screen size (scale inversely)
        if (pinSprite) {
          pinSprite.scale.set(1 / zoomScale)
        }

        // Answer marker stays fixed screen size
        if (answerSprite) {
          answerSprite.scale.set(1 / zoomScale)
        }

        // Hover ring stays fixed screen size
        hoverGraphics.scale.set(1 / zoomScale)
      }

      viewport.on('zoomed', updateScalesOnZoom)
      viewport.on('zoomed-end', updateScalesOnZoom)

      // Apply initial scale
      updateScalesOnZoom()

      // Handle click for pin placement
      viewport.on('clicked', (e) => {
        const worldX = (e.world.x - offsetX) / scale
        const worldY = (e.world.y - offsetY) / scale

        setPin({ x: worldX, y: worldY })

        if (pinSprite) {
          pinSprite.x = e.world.x
          pinSprite.y = e.world.y
        } else {
          pinSprite = new PIXI.Graphics()
          pinSprite.circle(0, 0, 10)
          pinSprite.fill({ color: 0xfbbf24 })
          pinSprite.circle(0, 0, 5)
          pinSprite.fill({ color: 0xffffff })
          pinSprite.x = e.world.x
          pinSprite.y = e.world.y
          // Apply initial scale to stay fixed screen size
          pinSprite.scale.set(1 / viewport.scaled)
          overlayContainer.addChild(pinSprite)
        }
      })

      // Mouse move handler for hover
      const onPointerMove = (e: any) => {
        const worldPos = viewport.toWorld(e.global)
        // Adjust search distance based on zoom level
        const searchDist = 20 / viewport.scaled
        const nearest = spatialIndex.findNearest(worldPos.x, worldPos.y, searchDist)

        if (nearest) {
          const sx = nearest.x * scale + offsetX
          const sy = nearest.y * scale + offsetY
          hoverGraphics.x = sx
          hoverGraphics.y = sy
          // Hover ring scales with zoom (matches point size)
          hoverGraphics.visible = true
        } else {
          hoverGraphics.visible = false
        }
      }

      viewport.on('pointermove', onPointerMove)

      // Center initially
      resetView()

      // Store refs
      pixiRef.current = {
        destroy: () => {
          app.destroy(true)
        },
        getWorldCoords: (screenX: number, screenY: number) => {
          const worldPos = viewport.toWorld({ x: screenX, y: screenY })
          return {
            x: (worldPos.x - offsetX) / scale,
            y: (worldPos.y - offsetY) / scale,
          }
        },
        getZoom: () => viewport.scaled,
        spatialIndex,
        scale,
        offsetX,
        offsetY,
        highlightPoints: (indices: Set<number>) => {
          // Clear existing highlights
          highlightSprites.forEach(sprite => {
            highlightContainer.removeChild(sprite)
            sprite.destroy()
          })
          highlightSprites.clear()

          // Reset all point alphas
          spriteMap.forEach(sprite => {
            sprite.alpha = indices.size > 0 ? 0.2 : 0.8
          })

          // Current zoom scale for fixed screen size
          const currentZoom = viewport.scaled
          const highlightScale = HIGHLIGHT_SPRITE_SCALE / currentZoom

          // Add highlights for matching points
          indices.forEach(index => {
            const point = data.find(p => p.index === index)
            if (!point) return

            const sx = point.x * scale + offsetX
            const sy = point.y * scale + offsetY

            const highlightSprite = new PIXI.Sprite(highlightTexture)
            highlightSprite.x = sx
            highlightSprite.y = sy
            highlightSprite.anchor.set(0.5)
            highlightSprite.scale.set(highlightScale)  // Fixed screen size
            highlightContainer.addChild(highlightSprite)
            highlightSprites.set(index, highlightSprite)

            // Make original sprite fully visible
            const originalSprite = spriteMap.get(index)
            if (originalSprite) {
              originalSprite.alpha = 1
            }
          })
        },
        showAnswerLine: (pin, answer) => {
          const pinSx = pin.x * scale + offsetX
          const pinSy = pin.y * scale + offsetY
          const ansSx = answer.x * scale + offsetX
          const ansSy = answer.y * scale + offsetY
          const currentZoom = viewport.scaled

          // Draw dotted line
          if (answerLine) {
            overlayContainer.removeChild(answerLine)
            answerLine.destroy()
          }
          answerLine = new PIXI.Graphics()

          // Draw dashed line
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

          // Create answer marker (green)
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
          // Scale inversely to stay fixed screen size
          answerSprite.scale.set(1 / currentZoom)
          overlayContainer.addChild(answerSprite)

          // Update pin sprite scale too
          if (pinSprite) {
            pinSprite.scale.set(1 / currentZoom)
          }
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
        },
        resetView,
        zoomToFit: (pin, answer) => {
          const pinSx = pin.x * scale + offsetX
          const pinSy = pin.y * scale + offsetY
          const ansSx = answer.x * scale + offsetX
          const ansSy = answer.y * scale + offsetY

          // Calculate bounding box with padding
          const minX = Math.min(pinSx, ansSx)
          const maxX = Math.max(pinSx, ansSx)
          const minY = Math.min(pinSy, ansSy)
          const maxY = Math.max(pinSy, ansSy)

          const boxWidth = maxX - minX
          const boxHeight = maxY - minY
          const centerX = (minX + maxX) / 2
          const centerY = (minY + maxY) / 2

          // Calculate zoom to fit with padding
          const paddingFactor = 0.3 // 30% padding on each side
          const targetZoomX = window.innerWidth / (boxWidth * (1 + paddingFactor * 2))
          const targetZoomY = window.innerHeight / (boxHeight * (1 + paddingFactor * 2))
          const targetZoom = Math.min(targetZoomX, targetZoomY, 2) // Cap at 2x zoom

          // Animate to the new view
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

          // Animate to center on the point with a reasonable zoom
          viewport.animate({
            position: { x: sx, y: sy },
            scale: 1.5,  // Zoom in a bit to show the area
            time: 400,
            ease: 'easeInOutSine',
          })
        },
      }

      // Add window mouse move listener for tooltip
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
      <div ref={containerRef} className="fixed inset-0" />

      {/* Tooltip */}
      {tooltip.visible && tooltip.point && (
        <div
          className="fixed z-50 pointer-events-none bg-game-surface border border-gray-700 rounded-lg px-3 py-2 shadow-xl max-w-xs"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y + 15,
            transform: tooltip.x > window.innerWidth - 200 ? 'translateX(-100%)' : undefined,
          }}
        >
          <p className="text-xs text-gray-400 mb-1">Feature #{tooltip.point.index}</p>
          <p className="text-sm text-white">
            {tooltip.point.description || 'No description available'}
          </p>
          {tooltip.point.sparsity !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Sparsity: {tooltip.point.sparsity.toFixed(3)}
            </p>
          )}
        </div>
      )}
    </>
  )
})

// Helper to interpolate between two colors
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
