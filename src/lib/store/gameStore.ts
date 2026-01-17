import { create } from 'zustand'
import type { GameState, RoundState, Puzzle, Point, ActivationTest } from '@/types'
import { calculateDistance, calculateScore } from '@/lib/services/scoring'

interface GameStore extends GameState {
  // Actions
  initGame: (puzzles: Puzzle[]) => void
  setPin: (point: Point) => void
  lockIn: () => void
  revealHint: () => void
  addActivationTest: (test: ActivationTest) => void
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
})

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  puzzles: [],
  currentRound: 0,
  rounds: [],
  totalScore: 0,

  // Initialize game with today's puzzles
  initGame: (puzzles) => {
    set({
      puzzles,
      currentRound: 0,
      rounds: puzzles.map(initialRoundState),
      totalScore: 0,
    })
  },

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
    const { currentRound, rounds, totalScore } = get()
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

    set({
      rounds: updatedRounds,
      totalScore: totalScore + score,
    })
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

  // Move to next round
  nextRound: () => {
    const { currentRound, rounds } = get()
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
    }
  },

  // Reset game
  reset: () => {
    set({
      puzzles: [],
      currentRound: 0,
      rounds: [],
      totalScore: 0,
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
