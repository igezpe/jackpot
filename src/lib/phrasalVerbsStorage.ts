import type { PhrasalVerbItem } from './phrasalVerbs'
import { DEFAULT_PHRASAL_VERBS } from './phrasalVerbs'

/** Clave de localStorage para los phrasal verbs (contenido + pesos). */
export const PHRASAL_VERBS_STORAGE_KEY = 'jackpot.phrasalVerbs.v1'

export const DEFAULT_PHRASAL_STORE: PhrasalVerbItem[] = DEFAULT_PHRASAL_VERBS

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback

const asVariants = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => asText(item)).filter((item) => item.length > 0)
}

const asWeight = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export function loadPhrasalVerbs(): PhrasalVerbItem[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PHRASAL_VERBS_STORAGE_KEY)
    if (!raw) return null
    return sanitizePhrasalData(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function savePhrasalVerbs(items: PhrasalVerbItem[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(PHRASAL_VERBS_STORAGE_KEY, JSON.stringify(items, null, 2))
    return true
  } catch {
    return false
  }
}

export function clearPhrasalVerbs(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(PHRASAL_VERBS_STORAGE_KEY)
  } catch {
    /* sin almacenamiento disponible */
  }
}

export function sanitizePhrasalData(input: unknown): PhrasalVerbItem[] | null {
  if (!Array.isArray(input)) return null
  const items = input
    .filter(isObject)
    .map((raw, index): PhrasalVerbItem => ({
      id: asText(raw.id, `pv_${index + 1}`),
      spanish: asText(raw.spanish),
      phrasalVerb: asText(raw.phrasalVerb),
      variants: asVariants(raw.variants),
      exampleContext: asText(raw.exampleContext),
      category: asText(raw.category, 'General'),
      difficultyWeight: asWeight(raw.difficultyWeight),
    }))
    .filter((p) => p.phrasalVerb.length > 0)

  return items.length > 0 ? items : null
}

export interface PhrasalSchemaReport {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function validatePhrasalSchema(input: unknown): PhrasalSchemaReport {
  const errors: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(input)) {
    return { ok: false, errors: ['El contenido debe ser una lista de phrasal verbs.'], warnings }
  }
  if (input.length === 0) {
    return { ok: false, errors: ['La lista de phrasal verbs no puede estar vacía.'], warnings }
  }

  input.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push(`El item #${index + 1} no es un objeto.`)
      return
    }
    if (asText(item.phrasalVerb).length === 0) errors.push(`El item #${index + 1} no tiene "phrasalVerb".`)
  })

  if (errors.length > 0) return { ok: false, errors, warnings }

  const clean = sanitizePhrasalData(input)
  if (!clean) {
    return { ok: false, errors: ['La configuración no se pudo normalizar a un formato válido.'], warnings }
  }

  const ids = clean.map((p) => p.id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length > 0) warnings.push(`Hay ids duplicados: ${[...new Set(dupes)].join(', ')}.`)
  if (clean.some((p) => !p.exampleContext)) warnings.push('Hay items sin oración de contexto.')

  return { ok: true, errors, warnings }
}
