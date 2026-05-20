import { create } from 'zustand'

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

interface OnboardingStore {
  onboardingStatus: OnboardingStatus
  onboardingSkippedAt: number | null
  replayActive: boolean
  setOnboardingStatus: (status: OnboardingStatus) => void
  setOnboardingSkippedAt: (step: number | null) => void
  triggerReplay: () => void
  resetReplay: () => void
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  onboardingStatus: 'pending',
  onboardingSkippedAt: null,
  replayActive: false,
  setOnboardingStatus: (status) => set({ onboardingStatus: status }),
  setOnboardingSkippedAt: (step) => set({ onboardingSkippedAt: step }),
  triggerReplay: () => set({ replayActive: true }),
  resetReplay: () => set({ replayActive: false }),
}))
