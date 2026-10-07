import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhrasalVerbItem } from '../lib/phrasalVerbs'
import {
  DEFAULT_PHRASAL_STORE,
  clearPhrasalVerbs,
  loadPhrasalVerbs,
  savePhrasalVerbs,
} from '../lib/phrasalVerbsStorage'

export interface PhrasalVerbsState {
  items: PhrasalVerbItem[]
  isCustom: boolean
  storageAvailable: boolean
  updateItems: (updater: (current: PhrasalVerbItem[]) => PhrasalVerbItem[]) => void
  replaceAll: (items: PhrasalVerbItem[]) => void
  /** Reinicia los pesos de dificultad a 1 sin tocar los verbos. */
  resetStats: () => void
  /** Vuelve a los phrasal verbs por defecto del JSON. */
  resetToDefault: () => void
}

/**
 * Estado de Phrasal Verbs con persistencia en `localStorage` (verbos + pesos),
 * con el mismo patrón de auto-guardado diferido que las otras secciones.
 */
export function usePhrasalVerbs(): PhrasalVerbsState {
  const [items, setItemsState] = useState<PhrasalVerbItem[]>(
    () => loadPhrasalVerbs() ?? DEFAULT_PHRASAL_STORE,
  )
  const [isCustom, setIsCustom] = useState<boolean>(() => loadPhrasalVerbs() !== null)
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
      setStorageAvailable(savePhrasalVerbs(items))
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

  const updateItems = useCallback((updater: (current: PhrasalVerbItem[]) => PhrasalVerbItem[]) => {
    setItemsState((current) => updater(current))
    setIsCustom(true)
  }, [])

  const replaceAll = useCallback((next: PhrasalVerbItem[]) => {
    setItemsState(next)
    setIsCustom(true)
  }, [])

  const resetStats = useCallback(() => {
    setItemsState((current) => current.map((p) => ({ ...p, difficultyWeight: 1 })))
    setIsCustom(true)
  }, [])

  const resetToDefault = useCallback(() => {
    skipPersist.current = true
    setItemsState(structuredClone(DEFAULT_PHRASAL_STORE))
    clearPhrasalVerbs()
    setIsCustom(false)
  }, [])

  return { items, isCustom, storageAvailable, updateItems, replaceAll, resetStats, resetToDefault }
}
