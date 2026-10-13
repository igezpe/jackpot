import type { OrderRequestItem } from './ordersRequests'
import { DEFAULT_ORDERS_REQUESTS } from './ordersRequests'

/** Clave de localStorage para Orders & Requests (contenido + pesos). */
export const ORDERS_REQUESTS_STORAGE_KEY = 'jackpot.ordersRequests.v1'

export const DEFAULT_OR_STORE: OrderRequestItem[] = DEFAULT_ORDERS_REQUESTS

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback

const asList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => asText(item)).filter((item) => item.length > 0)
}

const asWeight = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export function loadOrdersRequests(): OrderRequestItem[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ORDERS_REQUESTS_STORAGE_KEY)
    if (!raw) return null
    return sanitizeOrdersData(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function saveOrdersRequests(items: OrderRequestItem[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(ORDERS_REQUESTS_STORAGE_KEY, JSON.stringify(items, null, 2))
    return true
  } catch {
    return false
  }
}

export function clearOrdersRequests(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ORDERS_REQUESTS_STORAGE_KEY)
  } catch {
    /* sin almacenamiento disponible */
  }
}

export function sanitizeOrdersData(input: unknown): OrderRequestItem[] | null {
  if (!Array.isArray(input)) return null
  const items = input
    .filter(isObject)
    .map((raw, index): OrderRequestItem => ({
      id: asText(raw.id, `or_${index + 1}`),
      directSentence: asText(raw.directSentence),
      introContext: asText(raw.introContext),
      expectedVariants: asList(raw.expectedVariants),
      category: asText(raw.category, 'Order [+]'),
      difficultyWeight: asWeight(raw.difficultyWeight),
    }))
    .filter((p) => p.directSentence.length > 0 && p.expectedVariants.length > 0)

  return items.length > 0 ? items : null
}

export interface OrderSchemaReport {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function validateOrdersSchema(input: unknown): OrderSchemaReport {
  const errors: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(input)) {
    return { ok: false, errors: ['El contenido debe ser una lista de órdenes/peticiones.'], warnings }
  }
  if (input.length === 0) {
    return { ok: false, errors: ['La lista no puede estar vacía.'], warnings }
  }

  input.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push(`El ítem #${index + 1} no es un objeto.`)
      return
    }
    if (asText(item.directSentence).length === 0) errors.push(`El ítem #${index + 1} no tiene "directSentence".`)
    if (asList(item.expectedVariants).length === 0) {
      errors.push(`El ítem #${index + 1} no tiene variantes en "expectedVariants".`)
    }
  })

  if (errors.length > 0) return { ok: false, errors, warnings }

  const clean = sanitizeOrdersData(input)
  if (!clean) {
    return { ok: false, errors: ['La configuración no se pudo normalizar a un formato válido.'], warnings }
  }

  const ids = clean.map((p) => p.id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length > 0) warnings.push(`Hay ids duplicados: ${[...new Set(dupes)].join(', ')}.`)

  return { ok: true, errors, warnings }
}
