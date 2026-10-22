import type { VocabItem } from './vocabulary'
import { DEFAULT_VOCAB } from './vocabulary'

/** Clave de localStorage para el vocabulario (contenido + pesos). */
export const VOCABULARY_STORAGE_KEY = 'jackpot.vocabulary.v1'

export const DEFAULT_VOCAB_STORE: VocabItem[] = DEFAULT_VOCAB

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback

const asVariants = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => asText(item)).filter((item) => item.length > 0)
}

const asOptionalText = (value: unknown): string | undefined => {
  const text = asText(value)
  return text.length > 0 ? text : undefined
}

const asWeight = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export function loadVocabulary(): VocabItem[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(VOCABULARY_STORAGE_KEY)
    if (!raw) return null
    const stored = sanitizeVocabData(JSON.parse(raw) as unknown)
    return stored ? withDefaultVisuals(stored) : null
  } catch {
    return null
  }
}

/** Completa imagen/emoji de los ítems guardados con los visuales por defecto (por id). */
function withDefaultVisuals(items: VocabItem[]): VocabItem[] {
  const byId = new Map(DEFAULT_VOCAB.map((item) => [item.id, item]))
  const withVisuals = items.map((item) => {
    const base = byId.get(item.id)
    if (!base) return item
    return {
      ...item,
      image: item.image ?? base.image,
      emoji: item.emoji ?? base.emoji,
    }
  })

  // Si el listado guardado sólo usa ids por defecto, se le agregan los ítems
  // nuevos del JSON (p. ej. categorías recién añadidas) sin tocar los existentes.
  if (!withVisuals.every((item) => byId.has(item.id))) return withVisuals

  const present = new Set(withVisuals.map((item) => item.id))
  const missing = DEFAULT_VOCAB.filter((item) => !present.has(item.id))
  return missing.length > 0 ? [...withVisuals, ...missing] : withVisuals
}

export function saveVocabulary(items: VocabItem[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(items, null, 2))
    return true
  } catch {
    return false
  }
}

export function clearVocabulary(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(VOCABULARY_STORAGE_KEY)
  } catch {
    /* sin almacenamiento disponible */
  }
}

export function sanitizeVocabData(input: unknown): VocabItem[] | null {
  if (!Array.isArray(input)) return null
  const items = input
    .filter(isObject)
    .map((raw, index): VocabItem => ({
      id: asText(raw.id, `voc_${index + 1}`),
      spanish: asText(raw.spanish),
      english: asText(raw.english),
      variants: asVariants(raw.variants),
      category: asText(raw.category, 'General'),
      difficultyWeight: asWeight(raw.difficultyWeight),
      image: asOptionalText(raw.image),
      emoji: asOptionalText(raw.emoji),
    }))
    .filter((p) => p.english.length > 0)

  return items.length > 0 ? items : null
}

export interface VocabSchemaReport {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function validateVocabSchema(input: unknown): VocabSchemaReport {
  const errors: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(input)) {
    return { ok: false, errors: ['El contenido debe ser una lista de términos.'], warnings }
  }
  if (input.length === 0) {
    return { ok: false, errors: ['La lista de términos no puede estar vacía.'], warnings }
  }

  input.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push(`El término #${index + 1} no es un objeto.`)
      return
    }
    if (asText(item.spanish).length === 0) errors.push(`El término #${index + 1} no tiene "spanish".`)
    if (asText(item.english).length === 0) errors.push(`El término #${index + 1} no tiene "english".`)
  })

  if (errors.length > 0) return { ok: false, errors, warnings }

  const clean = sanitizeVocabData(input)
  if (!clean) {
    return { ok: false, errors: ['La configuración no se pudo normalizar a un formato válido.'], warnings }
  }

  const ids = clean.map((p) => p.id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length > 0) warnings.push(`Hay ids duplicados: ${[...new Set(dupes)].join(', ')}.`)

  return { ok: true, errors, warnings }
}
