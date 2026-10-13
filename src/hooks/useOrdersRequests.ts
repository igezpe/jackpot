import { useCallback, useEffect, useRef, useState } from 'react'
import type { OrderRequestItem } from '../lib/ordersRequests'
import {
  DEFAULT_OR_STORE,
  clearOrdersRequests,
  loadOrdersRequests,
  saveOrdersRequests,
} from '../lib/ordersRequestsStorage'

export interface OrdersRequestsState {
  items: OrderRequestItem[]
  isCustom: boolean
  storageAvailable: boolean
  updateItems: (updater: (current: OrderRequestItem[]) => OrderRequestItem[]) => void
  replaceAll: (items: OrderRequestItem[]) => void
  resetStats: () => void
  resetToDefault: () => void
}

/** Estado de Orders & Requests con persistencia en `localStorage` (ítems + pesos). */
export function useOrdersRequests(): OrdersRequestsState {
  const [items, setItemsState] = useState<OrderRequestItem[]>(
    () => loadOrdersRequests() ?? DEFAULT_OR_STORE,
  )
  const [isCustom, setIsCustom] = useState<boolean>(() => loadOrdersRequests() !== null)
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
      setStorageAvailable(saveOrdersRequests(items))
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

  const updateItems = useCallback((updater: (current: OrderRequestItem[]) => OrderRequestItem[]) => {
    setItemsState((current) => updater(current))
    setIsCustom(true)
  }, [])

  const replaceAll = useCallback((next: OrderRequestItem[]) => {
    setItemsState(next)
    setIsCustom(true)
  }, [])

  const resetStats = useCallback(() => {
    setItemsState((current) => current.map((p) => ({ ...p, difficultyWeight: 1 })))
    setIsCustom(true)
  }, [])

  const resetToDefault = useCallback(() => {
    skipPersist.current = true
    setItemsState(structuredClone(DEFAULT_OR_STORE))
    clearOrdersRequests()
    setIsCustom(false)
  }, [])

  return { items, isCustom, storageAvailable, updateItems, replaceAll, resetStats, resetToDefault }
}
