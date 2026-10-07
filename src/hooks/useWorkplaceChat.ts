import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatPhrase } from '../lib/workplaceChat'
import {
  DEFAULT_WORKPLACE_PHRASES,
  clearWorkplaceChat,
  loadWorkplaceChat,
  saveWorkplaceChat,
} from '../lib/workplaceChatStorage'

export interface WorkplaceChatState {
  phrases: ChatPhrase[]
  isCustom: boolean
  storageAvailable: boolean
  updatePhrases: (updater: (current: ChatPhrase[]) => ChatPhrase[]) => void
  replaceAll: (phrases: ChatPhrase[]) => void
  /** Reinicia los pesos de dificultad a 1 sin tocar las frases. */
  resetStats: () => void
  /** Vuelve a las frases por defecto del JSON. */
  resetToDefault: () => void
}

/**
 * Estado del Workplace Chat con persistencia en `localStorage` (frases + pesos).
 * Mismo patrón que `useReelsData` / `useConditionalsData` con auto-guardado diferido.
 */
export function useWorkplaceChat(): WorkplaceChatState {
  const [phrases, setPhrasesState] = useState<ChatPhrase[]>(
    () => loadWorkplaceChat() ?? DEFAULT_WORKPLACE_PHRASES,
  )
  const [isCustom, setIsCustom] = useState<boolean>(() => loadWorkplaceChat() !== null)
  const [storageAvailable, setStorageAvailable] = useState(true)

  const firstRun = useRef(true)
  const skipPersist = useRef(false)
  const persistTimer = useRef<number | null>(null)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (skipPersist.current) {
      skipPersist.current = false
      if (persistTimer.current) {
        window.clearTimeout(persistTimer.current)
        persistTimer.current = null
      }
      return
    }
    while (persistTimer.current) {
      window.clearTimeout(persistTimer.current)
      persistTimer.current = null
    }
    persistTimer.current = window.setTimeout(() => {
      setStorageAvailable(saveWorkplaceChat(phrases))
    }, 500)
  }, [phrases])

  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        window.clearTimeout(persistTimer.current)
        persistTimer.current = null
      }
    }
  }, [])

  const updatePhrases = useCallback((updater: (current: ChatPhrase[]) => ChatPhrase[]) => {
    setPhrasesState((current) => updater(current))
    setIsCustom(true)
  }, [])

  const replaceAll = useCallback((next: ChatPhrase[]) => {
    setPhrasesState(next)
    setIsCustom(true)
  }, [])

  const resetStats = useCallback(() => {
    setPhrasesState((current) => current.map((p) => ({ ...p, difficultyWeight: 1 })))
    setIsCustom(true)
  }, [])

  const resetToDefault = useCallback(() => {
    skipPersist.current = true
    setPhrasesState(structuredClone(DEFAULT_WORKPLACE_PHRASES))
    clearWorkplaceChat()
    setIsCustom(false)
  }, [])

  return { phrases, isCustom, storageAvailable, updatePhrases, replaceAll, resetStats, resetToDefault }
}
