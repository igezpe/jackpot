import { useCallback, useEffect, useRef, useState } from 'react'
import type { VocabItem } from '../lib/vocabulary'
import {
  DEFAULT_VOCAB_STORE,
  clearVocabulary,
  loadVocabulary,
  saveVocabulary,
} from '../lib/vocabularyStorage'

export interface VocabularyState {
  items: VocabItem[]
  isCustom: boolean
  storageAvailable: boolean
  updateItems: (updater: (current: VocabItem[]) => VocabItem[]) => void
  replaceAll: (items: VocabItem[]) => void
  /** Reinicia los pesos de dificultad a 1 sin tocar los términos. */
  resetStats: () => void
  /** Vuelve a los términos por defecto del JSON. */
  resetToDefault: () => void
}

/** Estado de Vocabulary con persistencia en `localStorage` (términos + pesos). */
export function useVocabulary(): VocabularyState {
  const [items, setItemsState] = useState<VocabItem[]>(() => loadVocabulary() ?? DEFAULT_VOCAB_STORE)
  const [isCustom, setIsCustom] = useState<boolean>(() => loadVocabulary() !== null)
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
      setStorageAvailable(saveVocabulary(items))
    }, 500)
  }, [items])

  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        window.clearTimeout(persistTimer.current)
        persistTimer.current = null
      }
    }
  }, [])

  const updateItems = useCallback((updater: (current: VocabItem[]) => VocabItem[]) => {
    setItemsState((current) => updater(current))
    setIsCustom(true)
  }, [])

  const replaceAll = useCallback((next: VocabItem[]) => {
    setItemsState(next)
    setIsCustom(true)
  }, [])

  const resetStats = useCallback(() => {
    setItemsState((current) => current.map((p) => ({ ...p, difficultyWeight: 1 })))
    setIsCustom(true)
  }, [])

  const resetToDefault = useCallback(() => {
    skipPersist.current = true
    setItemsState(structuredClone(DEFAULT_VOCAB_STORE))
    clearVocabulary()
    setIsCustom(false)
  }, [])

  return { items, isCustom, storageAvailable, updateItems, replaceAll, resetStats, resetToDefault }
}
