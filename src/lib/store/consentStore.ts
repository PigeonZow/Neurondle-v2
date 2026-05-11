import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ConsentStatus = 'pending' | 'accepted' | 'declined'

interface ConsentStore {
  consentStatus: ConsentStatus
  setConsentStatus: (status: ConsentStatus) => void
}

export const useConsentStore = create<ConsentStore>()(
  persist(
    (set) => ({
      consentStatus: 'pending',
      setConsentStatus: (status) => set({ consentStatus: status }),
    }),
    { name: 'neurondle-consent-v1' }
  )
)
