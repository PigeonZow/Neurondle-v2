# Claude Code Guidelines for Neurondle v2

## Key Documentation

- **[SPECS.md](SPECS.md)** - Complete game specification including:
  - Game mechanics and scoring
  - Neuronpedia API reference
  - Data structures and types
  - Database schema
  - UI/UX specification
  - Technical stack details
  - Implementation status

## Project Overview

Neurondle is a GeoGuessr-inspired game for AI interpretability research. Players guess where a mystery neuron is located on a 2D UMAP map based on observing what text activates it.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Visualization**: PixiJS v8 + pixi-viewport v6
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State**: Zustand

## Project Structure

```
/app/api/         - API routes (puzzles, sessions, activation, rounds)
/lib/services/    - Business logic
/lib/store/       - Zustand state management
/components/game/ - PixiJS canvas and game UI (client components)
/components/ui/   - Shared UI components
/types/           - TypeScript types
/scripts/         - Data sync and puzzle generation scripts
/public/data/     - Cached UMAP data
```

## Key Files

- `src/components/game/UmapCanvas.tsx` - Main PIXI.js visualization
- `src/components/game/GameControls.tsx` - Bottom panel with hints/input
- `src/lib/store/gameStore.ts` - Game state management
- `src/app/api/activation/route.ts` - Neuronpedia activation proxy

## Current SAE Configuration

Using `gemma-2-2b` with `12-gemmascope-res-16k` (16,384 features).
65K layers currently disabled (Neuronpedia returns 0 UMAP points).
