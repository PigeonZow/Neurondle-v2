import { create } from 'zustand'
import type { GameState, RoundState, Puzzle, Point, ActivationTest, LabelVerdict } from '@/types'
import { calculateDistance, calculateScore } from '@/lib/services/scoring'
import { persistRoundAttempt, persistSessionProgress, persistLabelVerdict } from '@/lib/services/sessions'

interface GameStore extends GameState {
  // Backend session id for this run (null until ensureSession resolves)
  sessionId: string | null
  // Unique id for this single playthrough; groups its rounds + activation tests
  gameId: string | null
  // Actions
  initGame: (puzzles: Puzzle[]) => void
  setSessionId: (id: string | null) => void
  setPin: (point: Point) => void
  lockIn: () => void
  revealHint: () => void
  addActivationTest: (test: ActivationTest) => void
  submitLabelVerdict: (verdict: LabelVerdict, suggestedLabel?: string) => void
  nextRound: () => void
  reset: () => void
}

const initialRoundState = (puzzle: Puzzle): RoundState => ({
  puzzle,
  phase: 'explore',
  pin: null,
  confirmed: false,
  score: null,
  distance: null,
  hintsRevealed: 1, // Show first hint by default
  activationTests: [],
  labelVerdict: null,
})

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  puzzles: [],
  currentRound: 0,
  rounds: [],
  totalScore: 0,
  sessionId: null,
  gameId: null,

  // Initialize game with today's puzzles
  initGame: (puzzles) => {
    set({
      puzzles,
      currentRound: 0,
      rounds: puzzles.map(initialRoundState),
      totalScore: 0,
      // New playthrough → new game id (groups this game's rows together)
      gameId: crypto.randomUUID(),
    })
  },

  // Store the backend session id once it resolves
  setSessionId: (id) => set({ sessionId: id }),

  // Place or move pin
  setPin: (point) => {
    const { currentRound, rounds } = get()
    const round = rounds[currentRound]

    if (!round || round.confirmed) return

    const updatedRounds = [...rounds]
    updatedRounds[currentRound] = {
      ...round,
      pin: point,
      phase: 'guess',
    }

    set({ rounds: updatedRounds })
  },

  // Lock in guess and calculate score
  lockIn: () => {
    const { currentRound, rounds, totalScore, sessionId, gameId } = get()
    const round = rounds[currentRound]

    if (!round || !round.pin || round.confirmed) return

    const distance = calculateDistance(round.pin, {
      x: round.puzzle.answerX,
      y: round.puzzle.answerY,
    })
    const score = calculateScore(distance)

    const updatedRounds = [...rounds]
    updatedRounds[currentRound] = {
      ...round,
      confirmed: true,
      phase: 'reveal',
      distance,
      score,
    }

    const newTotalScore = totalScore + score
    set({
      rounds: updatedRounds,
      totalScore: newTotalScore,
    })

    // Persist this guess (best-effort). Skip mock puzzles, whose ids aren't
    // real rows in the puzzles table and would fail the foreign key.
    if (sessionId && !round.puzzle.id.startsWith('mock')) {
      void persistRoundAttempt({
        sessionId,
        gameId,
        puzzleId: round.puzzle.id,
        roundNumber: round.puzzle.roundNumber,
        pinX: round.pin.x,
        pinY: round.pin.y,
        distance,
        score,
        hintsUsed: round.hintsRevealed,
        hintsAvailable: round.puzzle.hints.length,
      })
      // Keep the session-level running total / current round in sync.
      void persistSessionProgress({
        currentRound: round.puzzle.roundNumber,
        totalScore: newTotalScore,
      })
    }
  },

  // Reveal next hint
  revealHint: () => {
    const { currentRound, rounds } = get()
    const round = rounds[currentRound]

    if (!round || round.confirmed) return

    const maxHints = round.puzzle.hints.length
    if (round.hintsRevealed >= maxHints) return

    const updatedRounds = [...rounds]
    updatedRounds[currentRound] = {
      ...round,
      hintsRevealed: round.hintsRevealed + 1,
    }

    set({ rounds: updatedRounds })
  },

  // Add activation test result
  addActivationTest: (test) => {
    const { currentRound, rounds } = get()
    const round = rounds[currentRound]

    if (!round) return

    const updatedRounds = [...rounds]
    updatedRounds[currentRound] = {
      ...round,
      activationTests: [...round.activationTests, test],
    }

    set({ rounds: updatedRounds })
  },

  // Record the player's take on the auto-label. Called on the first verdict
  // tap, and again (same verdict) if they follow up with a suggested label.
  submitLabelVerdict: (verdict, suggestedLabel) => {
    const { currentRound, rounds, sessionId, gameId } = get()
    const round = rounds[currentRound]

    if (!round || !round.confirmed) return

    const updatedRounds = [...rounds]
    updatedRounds[currentRound] = {
      ...round,
      labelVerdict: verdict,
    }
    set({ rounds: updatedRounds })

    if (sessionId && !round.puzzle.id.startsWith('mock')) {
      void persistLabelVerdict({
        sessionId,
        gameId,
        puzzleId: round.puzzle.id,
        roundNumber: round.puzzle.roundNumber,
        verdict,
        suggestedLabel,
      })
    }
  },

  // Move to next round
  nextRound: () => {
    const { currentRound, rounds, totalScore, sessionId } = get()
    const round = rounds[currentRound]

    if (!round) return

    // Mark current round complete
    const updatedRounds = [...rounds]
    updatedRounds[currentRound] = {
      ...round,
      phase: 'complete',
    }

    // Move to next round or finish
    const nextRoundIndex = currentRound + 1
    if (nextRoundIndex < rounds.length) {
      set({
        rounds: updatedRounds,
        currentRound: nextRoundIndex,
      })
    } else {
      set({ rounds: updatedRounds })

      // Final round wrapped up — flag the session complete with its final score.
      if (sessionId) {
        void persistSessionProgress({ totalScore, completed: true })
      }
    }
  },

  // Reset game
  reset: () => {
    set({
      puzzles: [],
      currentRound: 0,
      rounds: [],
      totalScore: 0,
      gameId: null,
    })
  },
}))

// Selectors
export const selectCurrentRound = (state: GameStore) => state.rounds[state.currentRound]
export const selectIsGameComplete = (state: GameStore) =>
  state.rounds.length > 0 && state.rounds.every(r => r.phase === 'complete')
export const selectRevealedHints = (state: GameStore) => {
  const round = state.rounds[state.currentRound]
  if (!round) return []
  return round.puzzle.hints.slice(0, round.hintsRevealed)
}
