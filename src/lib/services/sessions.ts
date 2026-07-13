/**
 * Generate a session token based on browser fingerprint
 * Used for tracking sessions without requiring user accounts
 */
export function generateSessionToken(): string {
  // This runs client-side only
  if (typeof window === 'undefined') {
    return `session_server_${Date.now()}`
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx?.fillText('neurondle', 10, 10)

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset(),
    canvas.toDataURL().slice(-50),
  ].join('|')

  // Simple hash
  let hash = 0
  for (const char of fingerprint) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0)
    hash |= 0
  }

  return `session_${Math.abs(hash)}_${Date.now()}`
}

/**
 * Get or create session token from localStorage
 */
export function getSessionToken(): string {
  if (typeof window === 'undefined') {
    return generateSessionToken()
  }

  const stored = localStorage.getItem('neurondle_session')
  if (stored) {
    return stored
  }

  const token = generateSessionToken()
  localStorage.setItem('neurondle_session', token)
  return token
}

/**
 * Check if user has given research consent
 */
export function hasResearchConsent(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return localStorage.getItem('neurondle_research_consent') === 'true'
}

/**
 * Set research consent
 */
export function setResearchConsent(consent: boolean): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem('neurondle_research_consent', String(consent))
}

// === Backend persistence ===
//
// We collect gameplay data for EVERY run. The `research_consent` flag on the
// session row is the single label that determines whether a run is usable for
// research later — child rows (round_attempts, activation_tests) inherit it via
// their session_id join. All writes here are best-effort: a failed write must
// never break gameplay.

interface SessionRow {
  id: string
  research_consent: boolean
  current_round: number
  total_score: number
  completed: boolean
}

function sessionHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-session-token': getSessionToken(),
  }
}

/**
 * Get-or-create today's session row for this browser. Returns the row
 * (including its `id`, needed to link round/activation data), or null on error.
 */
export async function ensureSession(): Promise<SessionRow | null> {
  try {
    const res = await fetch('/api/sessions', {
      headers: { 'x-session-token': getSessionToken() },
    })
    if (!res.ok) return null
    return (await res.json()) as SessionRow
  } catch (error) {
    console.error('ensureSession failed:', error)
    return null
  }
}

/**
 * Persist the research-consent flag to the session. Ensures the session row
 * exists first so an early opt-in/opt-out isn't lost.
 */
export async function persistSessionConsent(consent: boolean): Promise<void> {
  try {
    await ensureSession()
    await fetch('/api/sessions', {
      method: 'POST',
      headers: sessionHeaders(),
      body: JSON.stringify({ researchConsent: consent }),
    })
  } catch (error) {
    console.error('persistSessionConsent failed:', error)
  }
}

/**
 * Update the session-level aggregates (running score, current round, completion).
 */
export async function persistSessionProgress(input: {
  currentRound?: number
  totalScore?: number
  completed?: boolean
}): Promise<void> {
  try {
    await fetch('/api/sessions', {
      method: 'POST',
      headers: sessionHeaders(),
      body: JSON.stringify(input),
    })
  } catch (error) {
    console.error('persistSessionProgress failed:', error)
  }
}

/**
 * Record a single locked-in guess.
 */
export async function persistRoundAttempt(input: {
  sessionId: string
  gameId: string | null
  puzzleId: string
  roundNumber: number
  pinX: number
  pinY: number
  distance: number
  score: number
}): Promise<void> {
  try {
    await fetch('/api/rounds', {
      method: 'POST',
      headers: sessionHeaders(),
      body: JSON.stringify(input),
    })
  } catch (error) {
    console.error('persistRoundAttempt failed:', error)
  }
}
