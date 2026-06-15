# Configuring SAEs

All SAE / Neuronpedia configuration lives in **one file**:
[`src/config/saes.ts`](../src/config/saes.ts). Everything else — the game,
the map, the activation probes, the puzzle generator, and the data-prep
scripts — reads from it. You should never have to edit model/layer values
anywhere else.

## Concepts

- **SAE** — a sparse autoencoder on Neuronpedia, identified by a `modelId` +
  `layer`. Each entry in `SAES` is one SAE plus display metadata.
- **Active SAE** — the single SAE used for puzzle generation and the live map,
  chosen by the `NEURONDLE_SAE` env var (falls back to `DEFAULT_SAE_ID`).
- **`enabled`** — `false` means the SAE is known but not usable for live play
  (e.g. the 65K layers currently return 0 UMAP points from Neuronpedia).

## Two pipelines (important)

Switching the SAE only takes effect after you **re-run the offline pipeline**,
because the live game just serves data that was prepared ahead of time.

- **Offline (you run these):** `cache-umap`, `sync-explanations`,
  `generate-puzzles` — build the map cache and puzzles in the DB.
- **Live (runs for players):** the map (`/api/umap`), activation probes
  (`/api/activation`), and serving today's puzzles.

The map and the probes read the active SAE too, so if the offline data and the
active SAE disagree, the game breaks (wrong map / rejected probes). One config
file keeps them in sync.

## Add a new SAE

1. Add an entry to `SAES` in `src/config/saes.ts`:
   ```ts
   my_new_sae: {
     id: 'my_new_sae',
     modelId: 'gemma-2-2b',
     layer: '20-gemmascope-res-16k',
     maxFeatures: 16384,
     displayName: 'Gemma 2 2B · Layer 20 (16K)',
     enabled: true,
   },
   ```
2. Point the app at it (pick one):
   - set `NEURONDLE_SAE=my_new_sae` in your env, **or**
   - change `DEFAULT_SAE_ID` in the config.
3. Re-run the offline pipeline so the data matches the new SAE:
   ```bash
   npm run cache-umap          # cache the map for it
   npm run sync-explanations   # optional: pull explanations
   npm run generate-puzzles    # build puzzles from the active SAE
   ```

## Switch the active SAE (already-known SAE)

Just set the env var and regenerate puzzles:

```bash
NEURONDLE_SAE=gemma_res_12_16k npm run generate-puzzles
```

If `NEURONDLE_SAE` names an SAE that isn't in `SAES`, the app throws a clear
error rather than silently falling back.

## Neuronpedia connection

Also configured in `src/config/saes.ts` via env:

- `NEURONPEDIA_BASE_URL` — defaults to `https://www.neuronpedia.org/api`.
- `NEURONPEDIA_API_KEY` — optional, for higher rate limits.

## What's *not* here yet

Evaluator / explanation selection (which explainer model to trust, the score
threshold) is still driven by `MIN_EXPLANATION_SCORE` and the puzzle-generator
logic. Centralizing those is a planned follow-up PR.
