import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persistSessionConsent } from '@/lib/services/sessions'

type ConsentStatus = 'pending' | 'accepted' | 'declined'

interface ConsentStore {
  consentStatus: ConsentStatus
  isModalOpen: boolean
  setConsentStatus: (status: ConsentStatus) => void
  openModal: () => void
  closeModal: () => void
}

export const useConsentStore = create<ConsentStore>()(
  persist(
    (set) => ({
      consentStatus: 'pending',
      isModalOpen: true,
      setConsentStatus: (status) => {
        set({ consentStatus: status, isModalOpen: false })
        // Mirror the choice to the backend so the session row is labeled.
        // Best-effort; never blocks the UI.
        void persistSessionConsent(status === 'accepted')
      },
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    {
      name: 'neurondle-consent-v1',
      partialize: (state) => ({ consentStatus: state.consentStatus }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isModalOpen = state.consentStatus === 'pending'
        }
      },
    }
  )
)
