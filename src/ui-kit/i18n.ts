// Owner: Dev B. English is the default (Space Apps rule), Portuguese is optional.
// Game content texts live in src/config/*.json; fixed UI texts live next to each
// screen as a `strings` object, so no shared translation file to fight over.
import { create } from 'zustand'
import type { LocalizedText } from '../config/schema'

export type Lang = 'en' | 'pt'

interface LangStore {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLang = create<LangStore>((set) => ({
  lang: 'en',
  setLang: (lang) => set({ lang }),
}))

export function translate(text: LocalizedText | string | undefined | null, lang: Lang): string {
  if (!text) return ''
  if (typeof text === 'string') return text
  return (lang === 'pt' && text.pt) || text.en || ''
}

export function useT() {
  const lang = useLang((s) => s.lang)
  return (text: LocalizedText | string | undefined | null) => translate(text, lang)
}
