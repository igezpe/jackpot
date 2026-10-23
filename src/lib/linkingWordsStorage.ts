import type { LinkingWordItem } from './linkingWords'
import { DEFAULT_LINKING_WORDS } from './linkingWords'
import { normalizeAnswerText } from './answerText'

/** Clave de localStorage para Linking Words (contenido + pesos). */
export const LINKING_WORDS_STORAGE_KEY = 'jackpot.linkingWords.v1'

export const DEFAULT_LINKING_STORE: LinkingWordItem[] = DEFAULT_LINKING_WORDS

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

export function loadLinkingWords(): LinkingWordItem[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LINKING_WORDS_STORAGE_KEY)
    if (!raw) return null
    const stored = sanitizeLinkingData(JSON.parse(raw) as unknown)
    return stored ? withContentUpdates(stored) : null
  } catch {
    return null
  }
}

/**
 * Fusiona los conectores nuevos del JSON con los guardados (por id) y agrega
 * los ítems que falten, siempre que el listado use sólo ids por defecto.
 * Conserva pesos y ediciones del usuario.
 */
function withContentUpdates(items: LinkingWordItem[]): LinkingWordItem[] {
  const byId = new Map(DEFAULT_LINKING_WORDS.map((p) => [p.id, p]))
  if (!items.every((p) => byId.has(p.id))) return items

  const merged = items.map((item) => {
    const base = byId.get(item.id)!
    const seen = new Set(item.validConnectors.map((c) => normalizeAnswerText(c)))
    const extra = base.validConnectors.filter((c) => !seen.has(normalizeAnswerText(c)))
    if (extra.length === 0) return item
    return { ...item, validConnectors: [...item.validConnectors, ...extra] }
  })

  const present = new Set(merged.map((p) => p.id))
  const missing = DEFAULT_LINKING_WORDS.filter((p) => !present.has(p.id))
  return missing.length > 0 ? [...merged, ...missing] : merged
}

export function saveLinkingWords(items: LinkingWordItem[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(LINKING_WORDS_STORAGE_KEY, JSON.stringify(items, null, 2))
    return true
  } catch {
    return false
  }
}

export function clearLinkingWords(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LINKING_WORDS_STORAGE_KEY)
  } catch {
    /* sin almacenamiento disponible */
  }
}

export function sanitizeLinkingData(input: unknown): LinkingWordItem[] | null {
  if (!Array.isArray(input)) return null
  const items = input
    .filter(isObject)
    .map((raw, index): LinkingWordItem => ({
      id: asText(raw.id, `lw_${index + 1}`),
      ideaA: asText(raw.ideaA),
      ideaB: asText(raw.ideaB),
      relationType: asText(raw.relationType, 'contrast'),
      relationLabel: asText(raw.relationLabel, 'Relación'),
      validConnectors: asList(raw.validConnectors),
      exampleFullSentence: asText(raw.exampleFullSentence),
      category: asText(raw.category, 'General'),
      difficultyWeight: asWeight(raw.difficultyWeight),
    }))
    .filter((p) => p.ideaA.length > 0 && p.ideaB.length > 0 && p.validConnectors.length > 0)

  return items.length > 0 ? items : null
}

export interface LinkingSchemaReport {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function validateLinkingSchema(input: unknown): LinkingSchemaReport {
  const errors: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(input)) {
    return { ok: false, errors: ['El contenido debe ser una lista de conectores.'], warnings }
  }
  if (input.length === 0) {
    return { ok: false, errors: ['La lista no puede estar vacía.'], warnings }
  }

  input.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push(`El ítem #${index + 1} no es un objeto.`)
      return
    }
    if (asText(item.ideaA).length === 0) errors.push(`El ítem #${index + 1} no tiene "ideaA".`)
    if (asText(item.ideaB).length === 0) errors.push(`El ítem #${index + 1} no tiene "ideaB".`)
    if (asList(item.validConnectors).length === 0) {
      errors.push(`El ítem #${index + 1} no tiene "validConnectors".`)
    }
    if (asText(item.exampleFullSentence).length === 0) {
      warnings.push(`El ítem #${index + 1} no tiene "exampleFullSentence"; se mostrará una frase generada.`)
    }
  })

  if (errors.length > 0) return { ok: false, errors, warnings }

  const clean = sanitizeLinkingData(input)
  if (!clean) {
    return { ok: false, errors: ['La configuración no se pudo normalizar a un formato válido.'], warnings }
  }

  const ids = clean.map((p) => p.id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length > 0) warnings.push(`Hay ids duplicados: ${[...new Set(dupes)].join(', ')}.`)

  return { ok: true, errors, warnings }
}
