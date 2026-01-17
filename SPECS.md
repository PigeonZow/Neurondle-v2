# Neurondle v2: Rebuild Guide

A GeoGuessr-inspired game for AI interpretability research. Players guess where a mystery neuron is located on a 2D UMAP map based on observing what text activates it.

---

## Table of Contents

1. [Game Vision](#1-game-vision)
2. [Game Mechanics](#2-game-mechanics)
3. [Neuronpedia API Reference](#3-neuronpedia-api-reference)
4. [Data Structures](#4-data-structures)
5. [Database Schema](#5-database-schema)
6. [Core Algorithms](#6-core-algorithms)
7. [UI/UX Specification](#7-uiux-specification)
8. [Technical Stack](#8-technical-stack)
9. [Scripts & Setup](#9-scripts--setup)

---

## 1. Game Vision

### Core Concept

**Neurondle is GeoGuessr for neurons.**

Players explore a full-screen 2D map of SAE features (projected via UMAP). Each feature represents a concept learned by an AI model. Players:

1. Receive a mystery feature
2. Test text inputs to understand what activates it
3. View hints (pre-computed high-activation examples)
4. Drop a pin on the map to guess the location
5. Score based on distance from the actual location

### Design Principles

- **Full-screen immersive map** - The UMAP IS the game, not a sidebar widget
- **Mobile-first** - Touch-friendly, works on phones
- **Game feel** - Smooth animations, satisfying interactions, clear feedback
- **Research tool** - Collect data on which features are easier/harder to interpret

### Reference Games

- **GeoGuessr** - Pin-drop mechanic, distance scoring, map exploration
- **TimeGuessr** - Historical photo guessing, similar pin-drop UX
- **Wordle** - Daily puzzle, share results
- **Semantle** - Semantic similarity exploration

---

## 2. Game Mechanics

### 2.1 Daily Structure

- **3 rounds per day** (expandable to other modes later: endless, difficulty tiers, etc.)
- Each round has a different SAE feature
- Total score = sum of 3 rounds (max 30,000)
- New puzzles at midnight UTC

### 2.2 Round Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. EXPLORE                                             │
│     - Test text inputs (unlimited)                      │
│     - View hints (progressive reveal)                   │
│     - Search/pan/zoom the UMAP                          │
├─────────────────────────────────────────────────────────┤
│  2. GUESS                                               │
│     - Click anywhere on map to place pin                │
│     - Can reposition before confirming                  │
│     - Press "Lock In" to confirm                        │
├─────────────────────────────────────────────────────────┤
│  3. REVEAL                                              │
│     - Show answer location (animated)                   │
│     - Draw line from guess to answer                    │
│     - Display score + distance                          │
│     - Show ground truth label                           │
├─────────────────────────────────────────────────────────┤
│  4. NEXT ROUND (or final results after round 3)        │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Text Activation Testing

Players test custom text to understand the feature.

**Input:** Any text string
**Output:**
- Maximum activation score (float, typically 0-100)
- Per-token activation values
- Visual highlighting by activation strength

**All tests are logged for research** (with privacy protection—actual text optionally excluded).

### 2.4 Hint System

Pre-generated hints from Neuronpedia's activation data:

- Up to 10 hints per puzzle
- Ordered **weakest → strongest** (progressive difficulty)
- Player can reveal hints one at a time, or all at once
- Each hint shows:
  - Full text example
  - Maximum activation score
  - Token-level highlighting

### 2.5 Scoring

**Distance Formula (Euclidean):**
```javascript
distance = Math.sqrt((pin.x - answer.x)² + (pin.y - answer.y)²)
```

**Score Formula (Exponential Decay):**
```javascript
if (distance < 0.5) {
  score = 10000  // Perfect
} else {
  score = Math.floor(10000 * Math.exp(-0.3 * distance))
}
```

**Score Feedback:**
| Score | Message | Emoji |
|-------|---------|-------|
| 9500+ | Perfect! | 🎯 |
| 7000+ | Excellent! | 🔥 |
| 5000+ | Great! | ⭐ |
| 3000+ | Good! | 👍 |
| 1000+ | Nice try! | 🙂 |
| 0+ | Keep exploring! | 🔍 |

---

## 3. Neuronpedia API Reference

Base URL: `https://www.neuronpedia.org/api`

### 3.1 Test Custom Text Activation

```http
POST /activation/new
Content-Type: application/json
X-API-Key: <optional, recommended>

{
  "feature": {
    "modelId": "gemma-2-2b",
    "source": "12-gemmascope-res-16k",
    "index": "1234"
  },
  "customText": "Your test text here"
}
```

**Response:**
```json
{
  "tokens": ["<bos>", "Your", " test", " text"],
  "values": [0, 0.5, 2.1, 0.8],
  "maxValue": 2.1,
  "modelId": "gemma-2-2b",
  "layer": "12-gemmascope-res-16k",
  "index": "1234"
}
```

**Notes:**
- Filter out `<bos>` token for display
- `values[i]` corresponds to `tokens[i]`

### 3.2 Get Feature Data

Gets explanation (ground truth label) and pre-computed activations (for hints).

```http
GET /feature/{modelId}/{layer}/{index}
```

**Example:** `GET /feature/gemma-2-2b/12-gemmascope-res-16k/1234`

**Response (key fields):**
```json
{
  "modelId": "gemma-2-2b",
  "layer": "12-gemmascope-res-16k",
  "index": "1234",
  "maxActApprox": 45.67,
  "explanations": [
    {
      "id": "exp_abc123",
      "description": "references to programming and code",
      "scores": [{ "value": 0.85 }]
    }
  ],
  "activations": [
    {
      "id": "act_001",
      "tokens": ["The", " code", " runs"],
      "values": [0, 45.67, 12.3],
      "maxValue": 45.67,
      "binMin": 40,
      "binMax": 50
    }
  ]
}
```

### 3.3 Get UMAP Data

Gets 2D coordinates for all features in a layer.

```http
POST /umap
Content-Type: application/json

{
  "modelId": "gemma-2-2b",
  "layers": ["12-gemmascope-res-16k"]
}
```

**Response:**
```json
{
  "12-gemmascope-res-16k": [
    {
      "index": 0,
      "description": "references to programming",
      "umap_x": -5.234,
      "umap_y": 3.891,
      "umap_log_feature_sparsity": -4.2
    }
  ]
}
```

**Notes:**
- Returns 16K+ points for 16K SAE (65K for 65K SAE)
- `description` is the explanation text (for search)
- `umap_log_feature_sparsity` can color points

### 3.4 Export All Explanations (Bulk Sync)

Downloads all explanations for a layer. Use this to populate your local database.

```http
GET /explanation/export?modelId={modelId}&saeId={layer}
X-API-Key: <optional>
```

**Example:** `GET /explanation/export?modelId=gemma-2-2b&saeId=12-gemmascope-res-16k`

**Response:**
```json
[
  {
    "modelId": "gemma-2-2b",
    "layer": "12-gemmascope-res-16k",
    "index": "0",
    "description": "references to the beginning or start of something",
    "explanationModelName": "gpt-4o-mini",
    "typeName": "oai_token-act-pair"
  }
]
```

**Notes:**
- Large response (~10-50MB depending on SAE size)
- Use batch inserts when storing locally
- Upsert on `(model_id, layer, feature_index)` to handle updates

### 3.5 Generate Explanation Score (Optional)

Requests Neuronpedia to score an explanation's quality.

```http
POST /explanation/score
Content-Type: application/json
X-API-Key: <required>

{
  "explanationId": "exp_abc123",
  "scorerModel": "gpt-4o-mini",
  "scorerType": "recall_alt"
}
```

**Response:**
```json
{
  "score": {
    "value": 0.85,
    "explanationScoreTypeName": "recall_alt"
  }
}
```

---

## 4. Data Structures

### 4.1 Core Types

```typescript
// === Puzzle & Game State ===

interface Puzzle {
  id: string;
  featureIndex: number;
  modelId: string;
  layer: string;
  date: string;              // YYYY-MM-DD
  roundNumber: number;       // 1, 2, or 3
  groundTruthLabel: string;
  hints: Hint[];
  answerX: number;           // UMAP coordinate
  answerY: number;
}

interface Hint {
  id: string;
  text: string;
  score: number;             // Max activation value
  tokens: TokenActivation[];
  level: number;             // 1 = weakest, 10 = strongest
}

interface TokenActivation {
  token: string;
  activation: number;
}

interface GameState {
  puzzles: Puzzle[];         // 3 puzzles for today
  currentRound: number;      // 0, 1, or 2 (0-indexed)
  rounds: RoundState[];
  totalScore: number;
}

interface RoundState {
  puzzle: Puzzle;
  phase: 'explore' | 'guess' | 'reveal' | 'complete';
  pin: { x: number; y: number } | null;
  confirmed: boolean;
  score: number | null;
  distance: number | null;
}

// === Activation Testing ===

interface ActivationTest {
  id: string;
  text: string;
  maxScore: number;
  tokens: TokenActivation[];
  timestamp: Date;
}

// === UMAP Data ===

interface UmapPoint {
  index: number;
  description: string;
  x: number;
  y: number;
  sparsity?: number;         // For coloring
}

// === SAE Configuration ===

interface SAEConfig {
  id: string;                // e.g., "gemma_res_12_16k"
  modelId: string;           // e.g., "gemma-2-2b"
  layer: string;             // e.g., "12-gemmascope-res-16k"
  maxFeatures: number;       // e.g., 16384
  displayName: string;
}
```

### 4.2 Available SAE Configurations

| ID | Model | Layer | Features |
|----|-------|-------|----------|
| `gemma_res_12_16k` | gemma-2-2b | 12-gemmascope-res-16k | 16,384 |
| `gemma_res_25_65k` | gemma-2-2b | 25-gemmascope-res-65k | 65,536 |
| `gemma_mlp_15_65k` | gemma-2-2b | 15-gemmascope-mlp-65k | 65,536 |

---

## 5. Database Schema

Clean schema for v2. All tables fresh—no legacy fields.

### 5.1 Explanations Table

Synced from Neuronpedia. Source of truth for feature descriptions.

```sql
CREATE TABLE explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  layer TEXT NOT NULL,
  feature_index INTEGER NOT NULL,
  description TEXT NOT NULL,
  explanation_model_name TEXT,       -- e.g., "gpt-4o-mini"
  type_name TEXT,                    -- e.g., "oai_token-act-pair"
  synced_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (model_id, layer, feature_index)
);

CREATE INDEX idx_explanations_lookup
  ON explanations(model_id, layer, feature_index);
```

### 5.2 Puzzles Table

Daily puzzles with pre-generated hints and cached UMAP coordinates.

```sql
CREATE TABLE puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 3),

  -- Feature identification
  model_id TEXT NOT NULL,
  layer TEXT NOT NULL,
  feature_index INTEGER NOT NULL,

  -- Ground truth (copied from explanations at generation time)
  ground_truth_label TEXT NOT NULL,

  -- UMAP coordinates (required for scoring)
  answer_x FLOAT NOT NULL,
  answer_y FLOAT NOT NULL,

  -- Pre-generated hints (JSON array)
  hints JSONB NOT NULL,

  -- Metadata
  explanation_score FLOAT,           -- Quality score (0-1)
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (date, round_number)
);

CREATE INDEX idx_puzzles_date ON puzzles(date);
```

### 5.3 Sessions Table

Player sessions (browser-based, no accounts).

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL,       -- Browser fingerprint
  date DATE NOT NULL,                -- Which day's puzzles

  -- Progress
  current_round INTEGER DEFAULT 1,
  total_score INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,

  -- Research consent
  research_consent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (session_token, date)
);

CREATE INDEX idx_sessions_lookup ON sessions(session_token, date);
```

### 5.4 Round Attempts Table

Final pin placements and scores.

```sql
CREATE TABLE round_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  puzzle_id UUID REFERENCES puzzles(id),
  round_number INTEGER NOT NULL,

  -- Guess
  pin_x FLOAT NOT NULL,
  pin_y FLOAT NOT NULL,

  -- Result
  distance FLOAT NOT NULL,
  score INTEGER NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_round_attempts_session ON round_attempts(session_id);
```

### 5.5 Activation Tests Table

Research data: intermediate exploration steps.

```sql
CREATE TABLE activation_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  puzzle_id UUID REFERENCES puzzles(id),
  round_number INTEGER NOT NULL,

  -- Test data (privacy-aware)
  text_input TEXT,                   -- NULL if research_consent=false
  text_length INTEGER NOT NULL,
  max_activation FLOAT NOT NULL,
  token_count INTEGER NOT NULL,

  -- Full token data (for deep research)
  token_activations JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activation_tests_session ON activation_tests(session_id);
CREATE INDEX idx_activation_tests_puzzle ON activation_tests(puzzle_id);
```

### 5.6 Used Features Table

Prevents recent feature repetition across days.

```sql
CREATE TABLE used_features (
  id INTEGER PRIMARY KEY DEFAULT 1,
  feature_keys TEXT[] NOT NULL,      -- ["gemma-2-2b/12-gemmascope-res-16k/1234", ...]
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Core Algorithms

### 6.1 Hint Generation

```typescript
function generateHints(activations: NeuronpediaActivation[], maxHints = 10): Hint[] {
  // 1. Filter positive activations
  const positive = activations.filter(a => a.maxValue > 0);

  // 2. Sort by strength (strongest first)
  positive.sort((a, b) => b.maxValue - a.maxValue);

  // 3. Deduplicate by normalized text
  const seen = new Set<string>();
  const unique = positive.filter(a => {
    const key = a.tokens.join('').trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 4. Take top N
  const selected = unique.slice(0, maxHints);

  // 5. Reverse for progressive difficulty (weakest first)
  selected.reverse();

  // 6. Format
  return selected.map((a, i) => ({
    id: `hint_${i + 1}`,
    text: a.tokens.join(''),
    score: a.maxValue,
    tokens: a.tokens.map((t, j) => ({ token: t, activation: a.values[j] ?? 0 })),
    level: i + 1,
  }));
}
```

### 6.2 Score Calculation

```typescript
function calculateDistance(pin: Point, answer: Point): number {
  return Math.sqrt(
    Math.pow(pin.x - answer.x, 2) +
    Math.pow(pin.y - answer.y, 2)
  );
}

function calculateScore(distance: number): number {
  if (distance < 0.5) return 10000;
  return Math.max(0, Math.floor(10000 * Math.exp(-0.3 * distance)));
}

function getScoreMessage(score: number): { message: string; emoji: string } {
  if (score >= 9500) return { message: 'Perfect!', emoji: '🎯' };
  if (score >= 7000) return { message: 'Excellent!', emoji: '🔥' };
  if (score >= 5000) return { message: 'Great!', emoji: '⭐' };
  if (score >= 3000) return { message: 'Good!', emoji: '👍' };
  if (score >= 1000) return { message: 'Nice try!', emoji: '🙂' };
  return { message: 'Keep exploring!', emoji: '🔍' };
}
```

### 6.3 Puzzle Generation

```typescript
async function generatePuzzle(date: string, roundNumber: number): Promise<Puzzle> {
  const config = getRandomSAEConfig();
  const usedFeatures = await getUsedFeatures();
  const minQuality = 0.7;

  for (let attempt = 0; attempt < 50; attempt++) {
    // Pick random unused feature
    let featureIndex: number;
    do {
      featureIndex = Math.floor(Math.random() * config.maxFeatures);
    } while (usedFeatures.has(`${config.modelId}/${config.layer}/${featureIndex}`));

    // Get feature data
    const feature = await neuronpedia.getFeature(config, featureIndex);

    // Check quality
    if (!feature.explanation) continue;
    if (feature.explanationScore < minQuality) continue;

    // Generate hints
    const hints = generateHints(feature.activations);
    if (hints.length < 3) continue;

    // Get UMAP coordinates
    const umapPoint = await getUmapPoint(config, featureIndex);
    if (!umapPoint) continue;

    // Mark as used
    await markFeatureUsed(config, featureIndex);

    return {
      id: crypto.randomUUID(),
      date,
      roundNumber,
      modelId: config.modelId,
      layer: config.layer,
      featureIndex,
      groundTruthLabel: feature.explanation,
      answerX: umapPoint.x,
      answerY: umapPoint.y,
      hints,
    };
  }

  throw new Error('Failed to generate quality puzzle');
}
```

### 6.4 Session Token (Browser Fingerprint)

```typescript
function generateSessionToken(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('neurondle', 10, 10);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset(),
    canvas.toDataURL().slice(-50),
  ].join('|');

  // Simple hash
  let hash = 0;
  for (const char of fingerprint) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }

  return `session_${Math.abs(hash)}_${Date.now()}`;
}
```

### 6.5 Token Highlighting Color

```typescript
function getTokenColor(activation: number, maxActivation: number): string {
  const normalized = Math.min(activation / maxActivation, 1);
  const opacity = Math.min(normalized * 1.5 + 0.1, 1);
  return `rgba(59, 130, 246, ${opacity})`; // Blue
}
```

---

## 7. UI/UX Specification

### 7.1 Screen Layout

**Full-screen map with floating overlay UI:**

```
┌─────────────────────────────────────────────────────────┐
│ [Round 2/3]                    [Total: 12,450] [≡ Menu] │  ← Header (floating)
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                    UMAP VISUALIZATION                   │
│                    (Full screen, pannable, zoomable)    │
│                                                         │
│                         📍 ← User's pin                 │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔍 Search features...                               │ │  ← Search bar
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Test: [Enter text to test...]               [Test]  │ │  ← Test input
│ └─────────────────────────────────────────────────────┘ │
│ [Show Hints (3/10)]           [🔒 Lock In]              │  ← Action buttons
└─────────────────────────────────────────────────────────┘
                              ↑
                    Bottom panel (collapsible on mobile)
```

### 7.2 Interaction States

**Explore Phase:**
- Pan/zoom map freely
- Click to place pin (amber/yellow marker)
- Can reposition pin unlimited times
- Test text → see results in expandable panel
- Reveal hints progressively

**Guess Phase (after clicking "Lock In"):**
- Pin turns red and locks
- Brief suspense animation
- Answer revealed (green star)
- Line drawn from pin to answer
- Score flies in with animation

**Reveal Phase:**
- Show ground truth label
- Show distance and score
- "Next Round" or "See Results" button

### 7.3 Mobile Considerations

- Bottom panel collapses to icons
- Tap to place pin (avoid accidental placement with tap-and-hold or confirmation)
- Swipe up to expand test/hints panel
- Large touch targets (min 44px)
- Pinch to zoom map

### 7.4 Visual Style

- **Dark mode default** (easier on eyes, game-like feel)
- Clean, minimal UI (the map IS the game)
- Smooth 60fps animations
- Subtle particle effects on score reveal
- Sound effects (optional, can disable)

### 7.5 Key Animations

1. **Pin drop** - Slight bounce when placed
2. **Lock in** - Pin pulses, then locks
3. **Answer reveal** - Star appears with ripple effect
4. **Distance line** - Draws from pin to answer
5. **Score counter** - Numbers roll up dramatically
6. **Round transition** - Smooth fade between rounds

---

## 8. Technical Stack

### 8.1 Recommended Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 14+ (App Router) | SSR, API routes, good DX |
| **Language** | TypeScript | Type safety |
| **Visualization** | **PixiJS** | Game-quality 60fps, handles 65K points, built for games |
| **Search** | Fuse.js | Client-side fuzzy search |
| **Database** | Supabase (PostgreSQL) | Easy setup, good free tier |
| **Styling** | Tailwind CSS | Utility-first, dark mode support |
| **Animation** | Framer Motion | Smooth UI animations |
| **State** | Zustand or Jotai | Simple, performant |

### 8.2 PixiJS Setup Notes

```typescript
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';

// Create application (full screen)
const app = new PIXI.Application({
  resizeTo: window,
  backgroundColor: 0x1a1a2e,
  antialias: true,
  resolution: window.devicePixelRatio,
  autoDensity: true,
});

document.body.appendChild(app.view);

// Create viewport for pan/zoom
const viewport = new Viewport({
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  worldWidth: 1000,
  worldHeight: 1000,
  events: app.renderer.events,
})
  .drag()
  .pinch()
  .wheel()
  .decelerate();

app.stage.addChild(viewport);

// For 16K-65K points, use ParticleContainer for performance
const pointsContainer = new PIXI.ParticleContainer(65536, {
  position: true,
  tint: true,
  alpha: true,
});

viewport.addChild(pointsContainer);

// Add points
umapData.forEach(point => {
  const sprite = PIXI.Sprite.from('point-texture');
  sprite.x = point.x * scale + offsetX;
  sprite.y = point.y * scale + offsetY;
  sprite.tint = getColorFromSparsity(point.sparsity);
  pointsContainer.addChild(sprite);
});

// Handle click for pin placement
viewport.on('clicked', (e) => {
  const worldPos = viewport.toWorld(e.screen.x, e.screen.y);
  placePin(worldPos.x, worldPos.y);
});
```

### 8.3 Project Structure (Modular Monolith)

Organize code by feature area for clean separation and maintainability:

```
/app
  /api
    /puzzles/         ← puzzle generation, daily fetch
    /sessions/        ← session management
    /activation/      ← text testing proxy to Neuronpedia
    /rounds/          ← pin placement, scoring

/lib
  /services/
    puzzles.ts        ← puzzle business logic
    sessions.ts       ← session business logic
    neuronpedia.ts    ← Neuronpedia API client
    scoring.ts        ← distance/score calculation
  /db/
    supabase.ts       ← database client

/components
  /game/              ← PixiJS canvas, game UI (client components)
  /ui/                ← shared UI components

/types/
  index.ts            ← shared TypeScript types
```

**Key principles:**
- Each `/api` folder handles one domain
- Business logic lives in `/lib/services`, not in API routes
- PixiJS components must be client components (`'use client'`)
- Keep API routes thin - they validate input and call services

### 8.4 Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...               # Server-side only

# Optional (for higher rate limits)
NEURONPEDIA_API_KEY=sk-np-...

# Puzzle generation
MIN_EXPLANATION_SCORE=0.7
MAX_FEATURE_HISTORY=100
```

---

## 9. Scripts & Setup

### 9.1 Explanation Sync Script

Run to populate/update the explanations table from Neuronpedia:

```typescript
// scripts/syncExplanations.ts
import { createClient } from '@supabase/supabase-js';

const SAE_CONFIGS = [
  { modelId: 'gemma-2-2b', layer: '12-gemmascope-res-16k' },
  { modelId: 'gemma-2-2b', layer: '25-gemmascope-res-65k' },
  { modelId: 'gemma-2-2b', layer: '15-gemmascope-mlp-65k' },
];

async function syncExplanations() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  for (const config of SAE_CONFIGS) {
    console.log(`Syncing ${config.modelId}/${config.layer}...`);

    // Download from Neuronpedia
    const response = await fetch(
      `https://www.neuronpedia.org/api/explanation/export?modelId=${config.modelId}&saeId=${config.layer}`,
      {
        headers: process.env.NEURONPEDIA_API_KEY
          ? { 'X-API-Key': process.env.NEURONPEDIA_API_KEY }
          : {},
      }
    );

    const explanations = await response.json();
    console.log(`Downloaded ${explanations.length} explanations`);

    // Batch upsert (1000 at a time)
    const batchSize = 1000;
    for (let i = 0; i < explanations.length; i += batchSize) {
      const batch = explanations.slice(i, i + batchSize).map(exp => ({
        model_id: exp.modelId,
        layer: exp.layer,
        feature_index: parseInt(exp.index),
        description: exp.description,
        explanation_model_name: exp.explanationModelName,
        type_name: exp.typeName,
        synced_at: new Date().toISOString(),
      }));

      await supabase
        .from('explanations')
        .upsert(batch, { onConflict: 'model_id,layer,feature_index' });

      console.log(`  ${Math.min(i + batchSize, explanations.length)}/${explanations.length}`);
    }
  }

  console.log('Sync complete!');
}

syncExplanations();
```

**Run with:**
```bash
npx tsx scripts/syncExplanations.ts
```

### 9.2 Daily Puzzle Generation

Run via cron at midnight UTC:

```typescript
// scripts/generateDailyPuzzles.ts
async function generateDailyPuzzles() {
  const date = new Date().toISOString().split('T')[0];

  for (const roundNumber of [1, 2, 3]) {
    const puzzle = await generatePuzzle(date, roundNumber);
    await savePuzzle(puzzle);
    console.log(`Generated round ${roundNumber}: feature ${puzzle.featureIndex}`);
  }
}

generateDailyPuzzles();
```

### 9.3 UMAP Data Caching (Optional)

For faster load times, cache UMAP data locally or in Supabase storage:

```typescript
// scripts/cacheUmapData.ts
async function cacheUmapData() {
  for (const config of SAE_CONFIGS) {
    const response = await fetch('https://neuronpedia.org/api/umap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: config.modelId, layers: [config.layer] }),
    });

    const data = await response.json();

    // Store in Supabase storage or file system
    await supabase.storage
      .from('umap-cache')
      .upload(`${config.modelId}/${config.layer}.json`, JSON.stringify(data));

    console.log(`Cached ${config.layer}`);
  }
}
```

### 9.4 Database Setup

Run these SQL statements in Supabase SQL editor to create the schema:

```sql
-- Run the CREATE TABLE statements from Section 5 above

-- Enable Row Level Security (optional but recommended)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_tests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own session data
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (session_token = current_setting('app.session_token', true));
```

---

## Appendix: Quick Reference

### Neuronpedia API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/activation/new` | POST | Test custom text |
| `/feature/{model}/{layer}/{index}` | GET | Get feature data + activations |
| `/umap` | POST | Get UMAP coordinates |
| `/explanation/export` | GET | Bulk export explanations |
| `/explanation/score` | POST | Generate quality score |

### Scoring Quick Reference

| Distance | Score | Message |
|----------|-------|---------|
| < 0.5 | 10,000 | Perfect! 🎯 |
| 1.0 | ~7,400 | Excellent! 🔥 |
| 3.0 | ~4,000 | Great! ⭐ |
| 5.0 | ~2,200 | Good! 👍 |
| 10.0 | ~500 | Nice try! 🙂 |
| 15.0 | ~100 | Keep exploring! 🔍 |

### Database Tables Summary

| Table | Purpose |
|-------|---------|
| `explanations` | Neuronpedia explanation cache (sync from API) |
| `puzzles` | Daily puzzles with hints + answer coords |
| `sessions` | Player sessions (per day) |
| `round_attempts` | Final pin placements |
| `activation_tests` | Research: exploration data |
| `used_features` | Prevent repetition |

---

## 10. Implementation Status

### 10.1 Completed Features

**Core Game Loop:**

- [x] Daily puzzle system with 3 rounds
- [x] Pin placement on UMAP map
- [x] Distance-based scoring with exponential decay
- [x] Round progression and final results overlay
- [x] Hint system with progressive reveal (weakest to strongest)

**UMAP Visualization (PixiJS v8 + pixi-viewport v6):**

- [x] Full-screen interactive canvas with 16K+ points
- [x] Pan/zoom/pinch navigation
- [x] Spatial indexing for efficient hover detection
- [x] Tooltip on hover showing feature index, description, sparsity
- [x] Search bar to filter/highlight points by description
- [x] Points colored by sparsity (blue to red gradient)
- [x] Automatic centering and zoom on load
- [x] View reset when advancing to next round

**Guess & Reveal:**

- [x] Yellow pin marker for player guess
- [x] Green marker for correct answer location
- [x] Dotted line drawn between guess and answer on reveal
- [x] Pin and line cleared when advancing rounds

**Activation Testing:**

- [x] Text input to test custom activations
- [x] Per-token activation highlighting
- [x] Hover tooltips showing activation values
- [x] Results displayed inline

**Data & Backend:**

- [x] Supabase database with all tables (puzzles, sessions, etc.)
- [x] UMAP data caching to local JSON files
- [x] Daily puzzle generation script
- [x] Neuronpedia API integration for activations

### 10.2 Technical Decisions

**PixiJS v8 Changes:**

- Using `new PIXI.Application()` with `await app.init()` (async initialization)
- Using `new PIXI.Graphics().fill({ color, alpha })` syntax
- Using individual sprites in Container (not ParticleContainer) for interactivity
- Spatial indexing via custom class for hover/click detection

**UMAP Point Rendering:**

- **Constant screen-size points**: All 16K point sprites scale inversely with zoom (`scale / zoomLevel`), keeping them the same screen size regardless of zoom. This allows precise pin placement when zoomed in (gaps between points grow).
- **High-resolution textures**: Textures are generated at 16px radius, then scaled down to 2px display size. This provides crisp rendering at any zoom level.
- **Pin and markers**: Yellow pin, green answer marker, and hover ring all use inverse zoom scaling to maintain fixed screen size.
- **Zoom-to-fit on reveal**: When answer is revealed, viewport animates to fit both pin and answer with 30% padding.

**SAE Configuration:**

- Currently using only `gemma-2-2b` with `12-gemmascope-res-16k` (16,384 features)
- 65K layers returned 0 UMAP points from Neuronpedia, so disabled for now

### 10.3 Not Yet Implemented

- [ ] Session persistence to database
- [ ] Research data collection (activation_tests table)
- [ ] Leaderboard / social sharing
- [ ] Mobile-specific UI optimizations
- [ ] Sound effects
- [ ] Bulk explanation sync script
- [ ] Multiple SAE layer support
