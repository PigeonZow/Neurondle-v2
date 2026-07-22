import { create } from 'zustand'

export type GuideSectionId =
  | 'what-youre-looking-at'
  | 'neurons-and-features'
  | 'sparse-autoencoders'
  | 'activations'
  | 'the-map'
  | 'why-neurondle'

interface FieldGuideStore {
  isOpen: boolean
  /** Section to scroll to on open; null opens at the top. */
  section: GuideSectionId | null
  openGuide: (section?: GuideSectionId) => void
  closeGuide: () => void
}

export const useFieldGuideStore = create<FieldGuideStore>((set) => ({
  isOpen: false,
  section: null,
  openGuide: (section) => set({ isOpen: true, section: section ?? null }),
  closeGuide: () => set({ isOpen: false }),
}))
