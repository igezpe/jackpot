import type { ChatPhrase } from './workplaceChat'
import { DEFAULT_CHAT_PHRASES } from './workplaceChat'

/** Clave de localStorage donde se guardan frases y pesos del Workplace Chat. */
export const WORKPLACE_CHAT_STORAGE_KEY = 'jackpot.workplaceChat.v1'

export const DEFAULT_WORKPLACE_PHRASES: ChatPhrase[] = DEFAULT_CHAT_PHRASES

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

/* -------------------------------------------------------------------------- */
/*                            Lectura / escritura                             */
/* -------------------------------------------------------------------------- */

export function loadWorkplaceChat(): ChatPhrase[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(WORKPLACE_CHAT_STORAGE_KEY)
    if (!raw) return null
    const stored = sanitizeChatData(JSON.parse(raw) as unknown)
    return stored ? withMissingDefaults(stored) : null
  } catch {
    return null
  }
}

/** Agrega las frases nuevas del JSON si el listado guardado usa solo ids por defecto. */
function withMissingDefaults(phrases: ChatPhrase[]): ChatPhrase[] {
  const defaultIds = new Set(DEFAULT_CHAT_PHRASES.map((p) => p.id))
  if (!phrases.every((p) => defaultIds.has(p.id))) return phrases

  const present = new Set(phrases.map((p) => p.id))
  const missing = DEFAULT_CHAT_PHRASES.filter((p) => !present.has(p.id))
  return missing.length > 0 ? [...phrases, ...missing] : phrases
}

export function saveWorkplaceChat(phrases: ChatPhrase[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(WORKPLACE_CHAT_STORAGE_KEY, JSON.stringify(phrases, null, 2))
    return true
  } catch {
    return false
  }
}

export function clearWorkplaceChat(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(WORKPLACE_CHAT_STORAGE_KEY)
  } catch {
    /* sin almacenamiento disponible */
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Saneado                                   */
/* -------------------------------------------------------------------------- */

export function sanitizeChatData(input: unknown): ChatPhrase[] | null {
  if (!Array.isArray(input)) return null
  const phrases = input
    .filter(isObject)
    .map((raw, index): ChatPhrase => ({
      id: asText(raw.id, `chat_${index + 1}`),
      spanish: asText(raw.spanish),
      englishVariants: asVariants(raw.englishVariants),
      category: asText(raw.category, 'General'),
      difficultyWeight: asWeight(raw.difficultyWeight),
    }))
    .filter((p) => p.spanish.length > 0 && p.englishVariants.length > 0)

  return phrases.length > 0 ? phrases : null
}

/* -------------------------------------------------------------------------- */
/*                                 Validación                                 */
/* -------------------------------------------------------------------------- */

export interface ChatSchemaReport {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function validateChatSchema(input: unknown): ChatSchemaReport {
  const errors: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(input)) {
    return { ok: false, errors: ['El contenido debe ser una lista de frases.'], warnings }
  }
  if (input.length === 0) {
    return { ok: false, errors: ['La lista de frases no puede estar vacía.'], warnings }
  }

  input.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push(`La frase #${index + 1} no es un objeto.`)
      return
    }
    if (asText(item.spanish).length === 0) errors.push(`La frase #${index + 1} no tiene "spanish".`)
    if (asVariants(item.englishVariants).length === 0) {
      errors.push(`La frase #${index + 1} no tiene variantes en "englishVariants".`)
    }
  })

  if (errors.length > 0) return { ok: false, errors, warnings }

  const clean = sanitizeChatData(input)
  if (!clean) {
    return { ok: false, errors: ['La configuración no se pudo normalizar a un formato válido.'], warnings }
  }

  const ids = clean.map((p) => p.id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length > 0) {
    warnings.push(`Hay ids duplicados: ${[...new Set(dupes)].join(', ')}.`)
  }

  return { ok: true, errors, warnings }
}
