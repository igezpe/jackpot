import { useCallback, useEffect, useRef, useState } from 'react'
import type { LinkingWordItem } from '../lib/linkingWords'
import {
  DEFAULT_LINKING_STORE,
  clearLinkingWords,
  loadLinkingWords,
  saveLinkingWords,
} from '../lib/linkingWordsStorage'

export interface LinkingWordsState {
  items: LinkingWordItem[]
  isCustom: boolean
  storageAvailable: boolean
  updateItems: (updater: (current: LinkingWordItem[]) => LinkingWordItem[]) => void
  replaceAll: (items: LinkingWordItem[]) => void
  resetStats: () => void
  resetToDefault: () => void
}

/** Estado de Linking Words con persistencia en `localStorage` (ítems + pesos). */
export function useLinkingWords(): LinkingWordsState {
  const [items, setItemsState] = useState<LinkingWordItem[]>(
    () => loadLinkingWords() ?? DEFAULT_LINKING_STORE,
  )
  const [isCustom, setIsCustom] = useState<boolean>(() => loadLinkingWords() !== null)
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
      setStorageAvailable(saveLinkingWords(items))
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

  const updateItems = useCallback((updater: (current: LinkingWordItem[]) => LinkingWordItem[]) => {
    setItemsState((current) => updater(current))
    setIsCustom(true)
  }, [])

  const replaceAll = useCallback((next: LinkingWordItem[]) => {
    setItemsState(next)
    setIsCustom(true)
  }, [])

  const resetStats = useCallback(() => {
    setItemsState((current) => current.map((p) => ({ ...p, difficultyWeight: 1 })))
    setIsCustom(true)
  }, [])

  const resetToDefault = useCallback(() => {
    skipPersist.current = true
    setItemsState(structuredClone(DEFAULT_LINKING_STORE))
    clearLinkingWords()
    setIsCustom(false)
  }, [])

  return { items, isCustom, storageAvailable, updateItems, replaceAll, resetStats, resetToDefault }
}
