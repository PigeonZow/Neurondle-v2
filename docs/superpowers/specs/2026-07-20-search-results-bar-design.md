# Search Results Bar with Jump-to-Match

**Date:** 2026-07-20
**Status:** Approved (user will evaluate final UX in-app)

## Problems

1. **UI bug:** `GameHeader` is a fixed-height bar (`h-14`) that vertically centers
   its contents. The active-filter indicator in `FeatureSearch` renders in normal
   flow below the input, making the component taller than the header — the input
   gets pushed up and the indicator clips against the header's bottom border.
2. **Missing UX:** With a highlight filter active there is no way to jump between
   matches; players must hover dots manually.

## Design

One change solves both: replace the in-flow indicator with a floating **results
bar** that also hosts jump-to-match controls.

### Data flow

- `GameContainer` computes `matchedPoints` (`useMemo` over `searchQuery` +
  `umapData`, lowercase substring on `description`, stable point-index order).
- `UmapCanvas` receives matched indices as a prop (`highlightIndices`) instead of
  recomputing the match internally — single source of truth for highlighted dots
  and the cycler.
- Cursor state (`matchCursor`, −1 = none) lives in `GameContainer`. Jumping calls
  the existing `centerOnPoint` (pan + zoom-to-reveal) and `setSearchHighlight`
  (red ring) canvas methods.

### Results bar (in `FeatureSearch`)

- Absolutely positioned below the input (`absolute top-full`), pill-styled to
  match existing surfaces. Hidden while the dropdown is open (same as the old
  indicator).
- Contents: filter icon + query, match count ("34 matches" before first jump,
  "3/34" while cycling), ‹ › jump buttons, ✕ clear.
- Zero matches: bar still shows ("No matches") with only the clear button.

### Interaction

- With a filter applied and the dropdown closed: **Enter** jumps to next match,
  **Shift+Enter** to previous; ‹ › buttons do the same. Cycling wraps around.
- If the input text no longer equals the active filter, Enter applies the new
  filter instead (browser-find semantics).
- Query change or clear: cursor resets, search ring clears (fixes a latent bug
  where the ring lingered after clearing).

## Verification

No test framework in the project. Verify on the dev server: header layout stays
fixed with a filter active, Enter/Shift+Enter and buttons cycle with the camera
following, edge cases above behave.
