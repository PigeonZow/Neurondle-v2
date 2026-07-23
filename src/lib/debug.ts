/**
 * Dev-only toggles, driven by the URL so they need no rebuild:
 *
 *   http://localhost:3000/?debug=bands
 *
 * enables the score-band visuals (the tuning panel and the ring overlay
 * around the answer at reveal). A normal URL leaves them off.
 */
export function scoreBandsDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('debug') === 'bands'
}
