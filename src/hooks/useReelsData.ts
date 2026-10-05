import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReelsData } from '../types'
import { DEFAULT_REELS_DATA, clearStorage, loadFromStorage, saveToStorage } from '../lib/storage'

/**
 * Estado de la configuración de los rodillos con persistencia en `localStorage`.
 *
 * - Arranca con `localStorage` si hay datos válidos; si no, con el JSON por defecto.
 * - Cada cambio del usuario se guarda automáticamente.
 * - `isCustom` indica si la configuración difiere de la original, para poder
 *   ofrecer "Restablecer por defecto".
 */
export interface ReelsDataState {
  data: ReelsData
  /** ¿Hay personalización guardada en este navegador? */
  isCustom: boolean
  /** ¿Se pudo leer algo de localStorage al arrancar? */
  storageAvailable: boolean
  setData: (updater: ReelsData | ((current: ReelsData) => ReelsData)) => void
  replaceAll: (data: ReelsData) => void
  resetToDefault: () => void
}

export function useReelsData(): ReelsDataState {
  const [data, setDataState] = useState<ReelsData>(() => loadFromStorage() ?? DEFAULT_REELS_DATA)
  const [isCustom, setIsCustom] = useState<boolean>(() => loadFromStorage() !== null)
  const [storageAvailable, setStorageAvailable] = useState(true)

  // `data` cambia en cada edición; el efecto persiste sin bloquear el render.
  const firstRun = useRef(true)
  const skipPersist = useRef(false)
  const persistTimer = useRef(null)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    // El restablecimiento ya limpia el almacenamiento: no hay que reescribirlo.
    if (skipPersist.current) {
      skipPersist.current = false
      // Limpiar timer pendiente de restablecimiento
      if (persistTimer.current) {
        window.clearTimeout(persistTimer.current)
        persistTimer.current = null
      }
      return
    }
    // Auto-save con debounce: guardar 500ms después de la última edición
    persistTimer.current = window.setTimeout(() => {
      const ok = saveToStorage(data)
      setStorageAvailable(ok)
    }, 500)
  }, [data])

  // Limpiar timer al desmontar el componente o cambiar de restablecer
  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        window.clearTimeout(persistTimer.current)
        persistTimer.current = null
      }
    }
  }, [])

  const setData = useCallback((updater: ReelsData | ((current: ReelsData) => ReelsData)) => {
    setDataState((current) => (typeof updater === 'function' ? updater(current) : updater))
    setIsCustom(true)
  }, [])

  const replaceAll = useCallback((next: ReelsData) => {
    setDataState(next)
    setIsCustom(true)
  }, [])

  const resetToDefault = useCallback(() => {
    // Copia profunda para no compartir referencias con la constante importada.
    skipPersist.current = true
    setDataState(structuredClone(DEFAULT_REELS_DATA))
    clearStorage()
    setIsCustom(false)
  }, [])

  return { data, isCustom, storageAvailable, setData, replaceAll, resetToDefault }
}