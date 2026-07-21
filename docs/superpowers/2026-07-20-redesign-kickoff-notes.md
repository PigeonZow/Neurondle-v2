# UI Redesign — Kickoff Notes (pre-compaction snapshot, 2026-07-20)

## Where things stand

- Branch stack (all unpushed): `main` ← `feat/pz/neuron-inspector` (12 commits, complete & verified) ← `feat/pz/ui-redesign` (current, empty).
- Built this session: search results bar + jump-to-match with tracked labels; free pin placement with hover-ring snap (radius `HOVER_RADIUS_PX`, zoom-aware); neuron inspector card (click dot → auto-label + candidate testing via `/api/activation` with `testKind`); map-wide probe (`/api/probe` → Neuronpedia `search-all`, magenta glow + legend chip, unlimited/ungated by choice); per-round reveal docked right (map stays explorable; finale `ResultsOverlay` stays full-screen); left panel restructured (pinned HUD/Lock In, scrollable middle).
- Migration `scripts/migrations/004_add_test_kind_and_probe.sql` still needs applying in Supabase (logging silently no-ops until then).

## Design decisions already made (don't relitigate)

- Labels framed as claims from an unreliable auto-labeler ("auto-label:" microcopy); the game's skill is reading through noise.
- Judgment data is collected via emotionally-motivated actions, NOT rating tasks (Patrick vetoed thumbs up/down as "AI labeling work"). Pin divergence + investigation trails are the passive signals; a "contest the label" mechanic at reveal is the candidate active one (deferred).
- Probes stay unlimited, no paraphrase gate; hint-echo filtering happens post-hoc in analysis via logged text.
- Reveal panel (right dock) is the future home of label rating/suggestion UI.

## Open UX threads (undecided)

1. Search filter persists across rounds — intended or reset?
2. Activation magnitude ≠ correctness: options are per-feature context in inspector (`maxActApprox` via GET /feature), glow dimming for high-density features (sparsity already in UMAP data), server-side `densityThreshold` on search-all. Patrick agrees it's an issue; solution not chosen.
3. Hover tooltip vs inspector: currently tooltip is suppressed while inspector open; true unification (hover = preview, click = pinned card) deferred to redesign.
4. Map legibility long-term: cluster/region "place names" at zoom levels (cartographic LOD) — the durable fix for "2000 matches for 'code'".

## Redesign scope

Palette, typography, surface treatment, microcopy voice, small furniture (pills/cards/legends). PIXI map + layout skeleton (map, left panel, header, right reveal dock) mostly stay. Current look is the near-black + bright-accent AI-default — the thing to escape.

## Direction options (proposed, awaiting Patrick's pick)

1. **Star atlas** (my recommendation): night-sky chart of an alien mind — graticule/coordinates/scale-bar furniture on the map, panels as chart legends, serif display + mono data voice, one restrained signal color. Cluster place-names slot in naturally later.
2. **Lab instrument**: specimen-bench clinical, mono-first, calibration ticks, neurons as specimen tags. Risk: long-label readability, CRT cliché.
3. **Field notebook**: warm paper annotation panels over the dark map. Risk: drifts toward the cream+serif AI default, softer scientific credibility.

## Working rules (also in memory)

- Never commit without Patrick's explicit ok.
- Small changes: typecheck only, he tests in-app. Big changes: browser-verify (subagent if he asks).
- Headless test recipe: Playwright + system Chrome, port 3000 already running, Decline consent → Skip tutorial.
