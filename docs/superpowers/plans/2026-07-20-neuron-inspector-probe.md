# Neuron Inspector + Map-Wide Probe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players investigate individual neurons (click a dot → floating card with the auto-label and a per-neuron activation test) and probe the whole map with custom text (every "Test your theory" run also lights up the top-activating dots as a glow overlay).

**Architecture:** Two new interaction surfaces on top of existing plumbing. The activation proxy (`/api/activation`) already accepts an arbitrary `featureIndex`, so candidate-neuron testing reuses it with a `testKind` marker. A new `/api/probe` route proxies Neuronpedia's `POST /api/search-all` (top-100 activating features for a text — verified to exist in the Neuronpedia source). PIXI-side, the glow is a third sprite overlay following the existing highlight-sprite pattern; the inspector is a DOM card positioned each frame via the existing `toScreen` conversion. Dot clicks change meaning: inspect instead of pin (design decision approved 2026-07-20); pinning-on-dot moves into the inspector's "Pin this neuron" button.

**Tech Stack:** Next.js 14 App Router API routes, PixiJS v8 + pixi-viewport, Zustand, Supabase (Postgres), Neuronpedia API.

## Global Constraints

- SAE config: `gemma-2-2b` / `12-gemmascope-res-16k` — always derive from `findSae(modelId, layer)`, never hardcode.
- **No test framework exists** (`npm run lint` is also broken — ESLint 9 vs legacy config). Verification gate per task: `npx tsc --noEmit` passes. One consolidated browser verification at the end (Task 7) — per Patrick's preference, in-app testing only for big changes; this qualifies.
- Probes are **unlimited and ungated** (approved). All probe/test text is logged server-side for research; consent filtering happens at analysis time via the session's `research_consent` flag, same as existing `activation_tests` rows.
- Research logging must NEVER fail the user-facing request (wrap inserts in try/catch, mirroring `/api/activation`).
- Probe glow color `0x22d3ee` (cyan) — must stay distinguishable from search-highlight yellow `0xfbbf24`, hover/search ring red `0xe94560`, pin yellow, answer green `0x22c55e`.
- Commit after each task on branch `feat/pz/neuron-inspector`; end commit messages with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Migration 004 + probe service + `/api/probe` route

**Files:**
- Create: `scripts/migrations/004_add_test_kind_and_probe.sql`
- Modify: `src/lib/services/neuronpedia.ts` (append after `getUmapData`)
- Create: `src/app/api/probe/route.ts`

**Interfaces:**
- Consumes: `findSae(modelId, layer)` from `@/config/saes`; `NEURONPEDIA`/`neuronpediaHeaders` already imported in `neuronpedia.ts`; `createServerClient` from `@/lib/db/supabase`.
- Produces: `searchAllActivations(config: SAEConfig, text: string): Promise<ProbeResponse>` where `ProbeResponse = { tokens: string[]; results: ProbeResult[] }` and `ProbeResult = { index: number; maxValue: number; maxValueIndex: number; values: number[] }`. Route `POST /api/probe` body `{ modelId, layer, text, sessionId?, gameId?, puzzleId?, roundNumber? }` → JSON `ProbeResponse`. Tasks 5 and 6 call this route; Task 3 consumes `results[].{index,maxValue}`.

- [ ] **Step 1: Write the migration**

```sql
-- scripts/migrations/004_add_test_kind_and_probe.sql
-- Distinguish what an activation_tests row was aimed at:
--   'mystery'   — the round's hidden neuron (existing behavior, default)
--   'candidate' — an arbitrary map neuron tested from the inspector
--   'probe'     — a map-wide search-all probe (top features stored in probe_results)
ALTER TABLE activation_tests
  ADD COLUMN IF NOT EXISTS test_kind TEXT NOT NULL DEFAULT 'mystery',
  ADD COLUMN IF NOT EXISTS target_feature_index INTEGER,
  ADD COLUMN IF NOT EXISTS probe_results JSONB;
```

Do NOT attempt to run this against Supabase — the executor has no DB access. Flag to Patrick that 004 needs applying (same as migrations 001–003). Until applied, the new logging inserts will fail and be swallowed by the existing try/catch — feature still works.

- [ ] **Step 2: Add `searchAllActivations` to the Neuronpedia service**

Append to `src/lib/services/neuronpedia.ts` (uses the module's existing `BASE_URL` and `getHeaders`):

```ts
export interface ProbeResult {
  index: number
  maxValue: number
  maxValueIndex: number
  values: number[]
}

export interface ProbeResponse {
  tokens: string[]
  results: ProbeResult[]
}

/**
 * Run text through the model and return the top activating features across
 * the whole SAE (Neuronpedia "search via inference"). numResults max is 100.
 */
export async function searchAllActivations(
  config: SAEConfig,
  text: string
): Promise<ProbeResponse> {
  const response = await fetch(`${BASE_URL}/search-all`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      modelId: config.modelId,
      // sourceSet is the layer id without its leading layer number,
      // e.g. "12-gemmascope-res-16k" -> "gemmascope-res-16k"
      sourceSet: config.layer.replace(/^\d+-/, ''),
      text,
      selectedLayers: [config.layer],
      sortIndexes: [],
      ignoreBos: true,
      densityThreshold: -1,
      numResults: 100,
    }),
  })

  if (!response.ok) {
    throw new Error(`Probe failed: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    tokens: data.tokens ?? [],
    results: (data.result ?? []).map((r: {
      index: string
      maxValue: number
      maxValueIndex: number
      values: number[]
    }) => ({
      index: parseInt(r.index, 10),
      maxValue: r.maxValue,
      maxValueIndex: r.maxValueIndex,
      values: r.values,
    })),
  }
}
```

- [ ] **Step 3: Create the probe route**

`src/app/api/probe/route.ts` (mirrors `/api/activation`'s shape and logging stance):

```ts
import { NextRequest, NextResponse } from 'next/server'
import { searchAllActivations } from '@/lib/services/neuronpedia'
import { findSae } from '@/config/saes'
import { createServerClient } from '@/lib/db/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { modelId, layer, text, sessionId, gameId, puzzleId, roundNumber } = body

    if (!modelId || !layer || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, layer, text' },
        { status: 400 }
      )
    }

    const config = findSae(modelId, layer)
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid model/layer combination' },
        { status: 400 }
      )
    }

    const probe = await searchAllActivations(config, text)

    // Research logging — same consent model as /api/activation: store for
    // every run, filter by sessions.research_consent at analysis time.
    // probe_results keeps only {index, maxValue} per feature to bound row size.
    if (sessionId && puzzleId && roundNumber && !String(puzzleId).startsWith('mock')) {
      try {
        const supabase = createServerClient()
        await supabase.from('activation_tests').insert({
          session_id: sessionId,
          puzzle_id: puzzleId,
          round_number: roundNumber,
          game_id: gameId ?? null,
          test_kind: 'probe',
          text_input: typeof text === 'string' ? text : null,
          text_length: typeof text === 'string' ? text.length : 0,
          token_count: probe.tokens.length,
          max_activation: probe.results[0]?.maxValue ?? 0,
          token_activations: null,
          probe_results: probe.results.map(r => ({ index: r.index, maxValue: r.maxValue })),
        })
      } catch (persistError) {
        console.error('Failed to persist probe:', persistError)
      }
    }

    return NextResponse.json(probe)
  } catch (error) {
    console.error('Probe error:', error)
    return NextResponse.json({ error: 'Probe failed' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` — expected: no output.

- [ ] **Step 5: Smoke the route against the running dev server**

Run: `curl -s -X POST http://localhost:3000/api/probe -H 'Content-Type: application/json' -d '{"modelId":"gemma-2-2b","layer":"12-gemmascope-res-16k","text":"def main(): print(hello)"}' | head -c 400`
Expected: JSON starting `{"tokens":[...],"results":[{"index":...` with ≤100 results. (No sessionId → no logging attempted.)

- [ ] **Step 6: Commit**

```bash
git add scripts/migrations/004_add_test_kind_and_probe.sql src/lib/services/neuronpedia.ts src/app/api/probe/route.ts
git commit -m "Add map-wide probe API via Neuronpedia search-all"
```

---

### Task 2: Mark candidate tests in `/api/activation` logging

**Files:**
- Modify: `src/app/api/activation/route.ts:9` (destructure) and `:42-52` (insert)

**Interfaces:**
- Consumes: existing route body fields.
- Produces: route now also accepts optional `testKind?: 'mystery' | 'candidate'` in the body; insert gains `test_kind` and `target_feature_index`. Task 5 sends `testKind: 'candidate'`.

- [ ] **Step 1: Destructure and log the new fields**

In `src/app/api/activation/route.ts`, change line 9 to:

```ts
    const { modelId, layer, featureIndex, text, sessionId, gameId, puzzleId, roundNumber, testKind } = body
```

and inside the `.insert({ ... })` object add two fields after `game_id`:

```ts
          test_kind: testKind === 'candidate' ? 'candidate' : 'mystery',
          target_feature_index: featureIndex,
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/activation/route.ts
git commit -m "Log test kind and target feature for activation tests"
```

---

### Task 3: Probe glow overlay in UmapCanvas

**Files:**
- Modify: `src/components/game/UmapCanvas.tsx` — pixiRef type (~line 64), `UmapCanvasRef` (~line 17), `useImperativeHandle`, texture setup (~line 289), `updateScalesOnZoom` (~line 345), pixi closure methods (~line 400), roundKey effect (~line 175).

**Interfaces:**
- Consumes: existing sprite/texture patterns (`highlightTexture`, `highlightSprites`, `updateScalesOnZoom`).
- Produces: `UmapCanvasRef.showProbeGlow(results: { index: number; value: number }[]): void` and `UmapCanvasRef.clearProbeGlow(): void`. Task 6 calls `showProbeGlow` via GameContainer.

- [ ] **Step 1: Add ref-interface and pixiRef-type entries**

In `UmapCanvasRef` (after `showPointLabel`):

```ts
  showProbeGlow: (results: { index: number; value: number }[]) => void
  clearProbeGlow: () => void
```

Same two signatures in the `pixiRef` inline type (after `setSearchHighlight`).

- [ ] **Step 2: Create probe texture, container, sprite map in `initPixi`**

After the `highlightTexture` / `HIGHLIGHT_SPRITE_SCALE` block (~line 293):

```ts
      // Probe glow: cyan halo, slightly larger than the highlight ring, with
      // per-sprite alpha encoding activation strength
      const probeGraphics = new PIXI.Graphics()
      probeGraphics.circle(0, 0, TEXTURE_RADIUS * 2)
      probeGraphics.fill({ color: 0x22d3ee, alpha: 1 })
      const probeTexture = app.renderer.generateTexture(probeGraphics)
      const PROBE_SPRITE_SCALE = (DISPLAY_RADIUS * 2) / (TEXTURE_RADIUS * 2)
      const probeSprites = new Map<number, any>()
      const probeContainer = new PIXI.Container()
```

Add `viewport.addChild(probeContainer)` immediately BEFORE the existing `viewport.addChild(highlightContainer)` so probe glow renders underneath search highlights.

- [ ] **Step 3: Scale probe sprites on zoom**

In `updateScalesOnZoom`, alongside the `highlightSprites.forEach` line:

```ts
        const probeScale = PROBE_SPRITE_SCALE / zoomScale
        probeSprites.forEach(sprite => { sprite.scale.set(probeScale) })
```

- [ ] **Step 4: Add closure methods to the `pixiRef.current` object**

After `setSearchHighlight`:

```ts
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
```

- [ ] **Step 5: Wire `useImperativeHandle` and round reset**

In `useImperativeHandle` add:

```ts
    showProbeGlow: (results: { index: number; value: number }[]) => {
      pixiRef.current?.showProbeGlow(results)
    },
    clearProbeGlow: () => {
      pixiRef.current?.clearProbeGlow()
    },
```

In the `roundKey` effect (which calls `clearPinAndLine()` / `resetView()`), add `pixiRef.current.clearProbeGlow()`.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit` — expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/components/game/UmapCanvas.tsx
git commit -m "Add probe glow overlay to UMAP canvas"
```

---

### Task 4: Click-to-inspect + `pinAtPoint`

**Files:**
- Modify: `src/components/game/UmapCanvas.tsx` — props interface, clicked handler (~line 360), `UmapCanvasRef` + `useImperativeHandle`, pixiRef type.

**Interfaces:**
- Consumes: existing `clicked` handler, `HOVER_RADIUS_PX`, `setPin`.
- Produces: new optional prop `onInspectPoint?: (point: UmapPoint) => void`; `UmapCanvasRef.pinAtPoint(point: { x: number; y: number }): void`; `UmapCanvasRef.getScreenPos(point: { x: number; y: number }): { x: number; y: number } | null`. Task 5 consumes all three.

- [ ] **Step 1: Add the prop and a render-fresh ref for it**

`UmapCanvasProps` gains `onInspectPoint?: (point: UmapPoint) => void`; destructure it in the component. The pixi closure is built once, so mirror the prop into a ref it can read:

```ts
  const onInspectPointRef = useRef(onInspectPoint)
  useEffect(() => { onInspectPointRef.current = onInspectPoint })
```

- [ ] **Step 2: Extract pin placement and rewire the clicked handler**

Replace the body of `viewport.on('clicked', ...)` with (keeping the existing sprite code, now inside `placePinAt`):

```ts
      // Shared by free-placement clicks and the inspector's "Pin this neuron"
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
```

- [ ] **Step 3: Expose `pinAtPoint` and `getScreenPos`**

pixiRef type gains `pinAtPoint: (point: { x: number; y: number }) => void`; in the closure object add:

```ts
        pinAtPoint: (point: { x: number; y: number }) => placePinAt(point.x, point.y),
```

`UmapCanvasRef` + `useImperativeHandle` gain:

```ts
    pinAtPoint: (point: { x: number; y: number }) => {
      pixiRef.current?.pinAtPoint(point)
    },
    getScreenPos: (point: { x: number; y: number }) => {
      return pixiRef.current ? pixiRef.current.toScreen(point.x, point.y) : null
    },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` — expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/UmapCanvas.tsx
git commit -m "Route dot clicks to inspector, expose pinAtPoint"
```

---

### Task 5: `NeuronInspector` floating card

**Files:**
- Create: `src/components/game/NeuronInspector.tsx`
- Modify: `src/components/game/GameContainer.tsx` (state + render + callbacks)
- Modify: `src/components/game/index.ts` (export, matching existing pattern)

**Interfaces:**
- Consumes: `UmapCanvasRef.pinAtPoint` / `getScreenPos` / `setSearchHighlight` (Task 4), `POST /api/activation` with `testKind: 'candidate'` (Task 2), `TokenWithTooltip` from `@/components/ui/TokenWithTooltip` (props: `token`, `activation`, `maxActivation`), `useGameStore` for `sessionId`/`gameId` and current round.
- Produces: `<NeuronInspector point={UmapPoint} anchor={() => ({x,y}|null)} onPin={(p: UmapPoint) => void} onClose={() => void} />`.

- [ ] **Step 1: Create the component**

`src/components/game/NeuronInspector.tsx`:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useGameStore, selectCurrentRound } from '@/lib/store/gameStore'
import { TokenWithTooltip } from '@/components/ui/TokenWithTooltip'
import type { UmapPoint, TokenActivation } from '@/types'

interface NeuronInspectorProps {
  point: UmapPoint
  anchor: () => { x: number; y: number } | null
  onPin: (point: UmapPoint) => void
  onClose: () => void
}

const CARD_WIDTH = 288 // w-72, used for viewport clamping

export function NeuronInspector({ point, anchor, onPin, onClose }: NeuronInspectorProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ maxValue: number; tokens: TokenActivation[] } | null>(null)

  const currentRound = useGameStore(selectCurrentRound)
  const sessionId = useGameStore(state => state.sessionId)
  const gameId = useGameStore(state => state.gameId)

  // Reset test state when switching neurons
  useEffect(() => {
    setText('')
    setResult(null)
  }, [point.index])

  // Follow the dot as the camera moves (same RAF pattern as the jump label)
  useEffect(() => {
    let raf = 0
    const track = () => {
      const pos = anchor()
      const el = cardRef.current
      if (pos && el) {
        const flipX = pos.x + 24 + CARD_WIDTH > window.innerWidth
        const x = flipX ? pos.x - 24 - CARD_WIDTH : pos.x + 24
        const y = Math.min(Math.max(pos.y - 40, 72), window.innerHeight - el.offsetHeight - 16)
        el.style.transform = `translate(${x}px, ${y}px)`
      }
      raf = requestAnimationFrame(track)
    }
    raf = requestAnimationFrame(track)
    return () => cancelAnimationFrame(raf)
  }, [anchor])

  // Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!currentRound) return null

  const handleTest = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      const response = await fetch('/api/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: currentRound.puzzle.modelId,
          layer: currentRound.puzzle.layer,
          featureIndex: point.index,
          text: text.trim(),
          testKind: 'candidate',
          sessionId,
          gameId,
          puzzleId: currentRound.puzzle.id,
          roundNumber: currentRound.puzzle.roundNumber,
        }),
      })
      if (!response.ok) throw new Error('Candidate test failed')
      const data = await response.json()
      setResult({
        maxValue: data.maxValue,
        tokens: data.tokens.map((token: string, i: number): TokenActivation => ({
          token,
          activation: data.values[i] ?? 0,
        })),
      })
    } catch (error) {
      console.error('Candidate test error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={cardRef}
      className="game-overlay fixed left-0 top-0 z-40 w-72 bg-game-surface/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-xl p-3"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-gray-400 font-mono">Feature #{point.index}</p>
        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="text-gray-400 hover:text-white p-0.5 -m-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-white mb-3">
        <span className="text-gray-400 text-xs">auto-label: </span>
        {point.description || 'No label'}
      </p>

      <div className="flex gap-1.5 mb-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTest()}
          placeholder="Test this neuron..."
          className="flex-1 min-w-0 bg-white/5 border border-white/10 hover:border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/60 focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-primary-500/30 transition-colors"
        />
        <button
          onClick={handleTest}
          disabled={loading || !text.trim()}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight ${
            loading || !text.trim()
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {loading ? '...' : 'Test'}
        </button>
      </div>

      {result && (
        <div className="bg-white/5 rounded-lg p-2 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Max activation:</span>
            <span className="text-xs font-mono text-primary-400">{result.maxValue.toFixed(2)}</span>
          </div>
          <div className="flex flex-wrap gap-0.5">
            {result.tokens.map((t, i) => (
              <TokenWithTooltip
                key={i}
                token={t.token}
                activation={t.activation}
                maxActivation={result.maxValue}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onPin(point)}
        className="w-full py-1.5 rounded-lg text-sm font-medium bg-game-highlight/20 hover:bg-game-highlight/30 text-game-highlight border border-game-highlight/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
      >
        Pin this neuron
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Wire into GameContainer**

In `src/components/game/GameContainer.tsx`: import `NeuronInspector`; add state and callbacks:

```tsx
  const [inspected, setInspected] = useState<UmapPoint | null>(null)

  // Close the inspector when the round changes
  useEffect(() => { setInspected(null) }, [currentRoundIndex])

  const handleInspectorAnchor = useCallback(
    () => (inspected ? umapRef.current?.getScreenPos(inspected) ?? null : null),
    [inspected]
  )

  const handleInspectorPin = useCallback((point: UmapPoint) => {
    umapRef.current?.pinAtPoint({ x: point.x, y: point.y })
    setInspected(null)
  }, [])
```

Pass `onInspectPoint={setInspected}` to `<UmapCanvas>`. Render after `<GameControls />`:

```tsx
      {inspected && (
        <NeuronInspector
          point={inspected}
          anchor={handleInspectorAnchor}
          onPin={handleInspectorPin}
          onClose={() => setInspected(null)}
        />
      )}
```

- [ ] **Step 3: Export from the barrel** — add `export { NeuronInspector } from './NeuronInspector'` to `src/components/game/index.ts` if other game components are exported there (match the existing file's pattern).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` — expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/NeuronInspector.tsx src/components/game/GameContainer.tsx src/components/game/index.ts
git commit -m "Add neuron inspector card with candidate testing"
```

---

### Task 6: Unify "Test your theory" with the map probe

**Files:**
- Modify: `src/components/game/TestInput.tsx` (fire probe alongside mystery test)
- Modify: `src/components/game/GameControls.tsx` (thread the callback prop)
- Modify: `src/components/game/GameContainer.tsx` (provide the callback)

**Interfaces:**
- Consumes: `POST /api/probe` (Task 1), `UmapCanvasRef.showProbeGlow` (Task 3).
- Produces: `GameControls` gains prop `onProbeResults: (results: { index: number; maxValue: number }[]) => void`; `TestInput` gains the same prop.

- [ ] **Step 1: GameContainer callback**

```tsx
  const handleProbeResults = useCallback(
    (results: { index: number; maxValue: number }[]) => {
      umapRef.current?.showProbeGlow(
        results.map(r => ({ index: r.index, value: r.maxValue }))
      )
    },
    []
  )
```

Pass `<GameControls onProbeResults={handleProbeResults} />`.

- [ ] **Step 2: Thread through GameControls**

Add a props interface `{ onProbeResults: (results: { index: number; maxValue: number }[]) => void }` and pass it to `<TestInput onProbeResults={onProbeResults} />`.

- [ ] **Step 3: Fire the probe from TestInput**

In `TestInput`, accept the prop, and inside `handleTest` — immediately after the mystery `fetch` is issued, fire the probe in parallel (do not block or fail the mystery result):

```ts
    // Map-wide probe with the same text: lights up the top-activating dots.
    // Fire-and-forget so the mystery result isn't delayed by it.
    fetch('/api/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: currentRound.puzzle.modelId,
        layer: currentRound.puzzle.layer,
        text: text.trim(),
        sessionId,
        gameId,
        puzzleId: currentRound.puzzle.id,
        roundNumber: currentRound.puzzle.roundNumber,
      }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.results) onProbeResults(d.results) })
      .catch(() => {})
```

Under the result display, add one caption line:

```tsx
          <p className="text-[10px] text-gray-500 mt-1">cyan glow on the map = where this text activates</p>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` — expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/TestInput.tsx src/components/game/GameControls.tsx src/components/game/GameContainer.tsx
git commit -m "Light up map probe glow on every activation test"
```

---

### Task 7: Onboarding copy + consolidated browser verification

**Files:**
- Modify: `src/components/OnboardingFlow.tsx` — the `STEPS` entry with `selector: '[data-onboarding="feature-search"]'` (body currently: `'Search the map for concepts, and click anywhere to drop a pin.'`)

- [ ] **Step 1: Update the copy** (Patrick just reworded this — minimal touch, flag it in the summary):

```ts
    body: 'Search the map for concepts. Click a dot to inspect that neuron, or click empty space to drop your pin.',
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`, no output.

- [ ] **Step 3: Consolidated browser verification** (this is a big change — warranted). Use the recipe in memory (`neurondle-headless-test-recipe`): Playwright + system Chrome against the running dev server on port 3000; Decline consent → Skip tutorial. Verify:
  1. Type "function calls in python" into the left-panel Test box, run → mystery activation shows AND cyan glow appears on the map (screenshot).
  2. Click a glowing/any dot → inspector card appears anchored near it with `Feature #N`, auto-label text (screenshot).
  3. Run a test inside the inspector → per-token results render.
  4. Click "Pin this neuron" → card closes, pin appears on that dot (screenshot).
  5. Click empty space → pin moves there freely; card stays closed.
  6. Escape / X close the card. Pan camera while card open → card tracks the dot.
  7. `console` errors: only the known pre-existing 404.

- [ ] **Step 4: Commit**

```bash
git add src/components/OnboardingFlow.tsx
git commit -m "Update onboarding copy for click-to-inspect"
```

---

## Self-review notes

- Spec coverage: inspector (click-to-inspect, floating card, label-as-claim, candidate testing, pin button) → Tasks 4+5; probe (unlimited, glow, unified with test input) → Tasks 1+3+6; research logging with post-hoc consent filtering → Tasks 1+2; behavior-change copy → Task 7. UI redesign is explicitly OUT of scope (separate plan).
- The `sortIndexes: []` default sorts search-all results by max activation of any token — matches the glow's intent.
- Known minor: hover tooltip may briefly show alongside the inspector card for the same dot; accepted (card is offset by 24px).
- Migration 004 must be applied by Patrick in Supabase before logging rows appear; feature degrades gracefully until then.
