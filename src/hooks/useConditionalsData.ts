import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConditionalData } from '../lib/conditionals'
import {
  DEFAULT_CONDITIONAL_DATA,
  clearConditionalsStorage,
  loadConditionalsFromStorage,
  saveConditionalsToStorage,
} from '../lib/conditionalsStorage'

export interface ConditionalsDataState {
  data: ConditionalData
  /** ¿Hay personalización guardada en este navegador? */
  isCustom: boolean
  /** ¿Se pudo leer algo de localStorage al arrancar? */
  storageAvailable: boolean
  setData: (updater: ConditionalData | ((current: ConditionalData) => ConditionalData)) => void
  replaceAll: (data: ConditionalData) => void
  resetToDefault: () => void
}

/**
 * Estado de la configuración de condicionales con persistencia en `localStorage`.
 * Mismo comportamiento que `useReelsData`, pero con auto-guardado diferido (debounce).
 */
export function useConditionalsData(): ConditionalsDataState {
  const [data, setDataState] = useState<ConditionalData>(
    () => loadConditionalsFromStorage() ?? DEFAULT_CONDITIONAL_DATA,
  )
  const [isCustom, setIsCustom] = useState<boolean>(() => loadConditionalsFromStorage() !== null)
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
      setStorageAvailable(saveConditionalsToStorage(data))
    }, 500)
  }, [data])

  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        window.clearTimeout(persistTimer.current)
        persistTimer.current = null
      }
    }
  }, [])

  const setData = useCallback((updater: ConditionalData | ((current: ConditionalData) => ConditionalData)) => {
    setDataState((current) => (typeof updater === 'function' ? updater(current) : updater))
    setIsCustom(true)
  }, [])

  const replaceAll = useCallback((next: ConditionalData) => {
    setDataState(next)
    setIsCustom(true)
  }, [])

  const resetToDefault = useCallback(() => {
    skipPersist.current = true
    setDataState(structuredClone(DEFAULT_CONDITIONAL_DATA))
    clearConditionalsStorage()
    setIsCustom(false)
  }, [])

  return { data, isCustom, storageAvailable, setData, replaceAll, resetToDefault }
}
