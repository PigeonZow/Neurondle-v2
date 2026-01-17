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
