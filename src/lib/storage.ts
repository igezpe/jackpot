import rawDefaultData from '../data/reelsData.json'
import type { Polarity, ReelsData, Tense } from '../types'
import { TENSE_INFO } from './grammar'

/** Estado inicial de la aplicación, tomado de `src/data/reelsData.json`. */
export const DEFAULT_REELS_DATA: ReelsData = rawDefaultData as ReelsData

/** Clave de `localStorage` donde se guardan las personalizaciones. */
export const STORAGE_KEY = 'jackpot.reelsData.v1'

/* -------------------------------------------------------------------------- */
/*                            Lectura de localStorage                          */
/* -------------------------------------------------------------------------- */

export function loadFromStorage(): ReelsData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return sanitizeData(parsed)
  } catch {
    return null
  }
}

export function saveToStorage(data: ReelsData): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2))
    return true
  } catch {
    return false
  }
}

export function clearStorage(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* sin almacenamiento disponible */
  }
}

/* -------------------------------------------------------------------------- */
/*                    Saneado y validación del esquema JSON                   */
/* -------------------------------------------------------------------------- */

export interface SchemaReport {
  ok: boolean
  errors: string[]
  warnings: string[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback

const asOptionalText = (value: unknown): string | undefined => {
  const text = asText(value)
  return text.length > 0 ? text : undefined
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => asText(item)).filter((item) => item.length > 0)
}

function asStringList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const list = value.map((item) => asText(item)).filter((item) => item.length > 0)
    return list.length > 0 ? list : undefined
  }
  // Permite escribir "already, yet, ever" en un campo de texto simple.
  if (typeof value === 'string') {
    const list = value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
    return list.length > 0 ? list : undefined
  }
  return undefined
}

const POLARITIES = new Set<string>(['affirmative', 'negative', 'interrogative'])
const TENSES = new Set<string>(Object.keys(TENSE_INFO))

/** Polaridad válida, o `affirmative` por defecto. */
function asPolarity(value: unknown): Polarity {
  const text = asText(value, 'affirmative')
  return POLARITIES.has(text) ? (text as Polarity) : 'affirmative'
}

/** Tiempo verbal conocido por el motor, o `present_simple` por defecto. */
function asTense(value: unknown): Tense {
  const text = asText(value, 'present_simple')
  return TENSES.has(text) ? (text as Tense) : 'present_simple'
}

/**
 * Normaliza un objeto arbitrario a `ReelsData`, descartando lo que no encaje.
 * Devuelve `null` si faltan secciones obligatorias o alguna queda vacía.
 */
export function sanitizeData(input: unknown): ReelsData | null {
  if (!isObject(input)) return null

  const subjects = asStringArray(input.subjects)
  const verbs = Array.isArray(input.verbs)
    ? input.verbs.filter(isObject).map((raw, index) => ({
        id: asText(raw.id, String(index + 1)),
        verb: asText(raw.verb),
        object: asText(raw.object),
        past: asText(raw.past),
        participle: asText(raw.participle),
        ing: asOptionalText(raw.ing),
        third: asOptionalText(raw.third),
      }))
    : []
  const sentenceTypes = Array.isArray(input.sentenceTypes)
    ? input.sentenceTypes
        .filter(isObject)
        .map((raw, index) => ({
          id: asText(raw.id, String(index + 1)),
          label: asText(raw.label),
          type: asPolarity(raw.type),
        }))
    : []
  const moments = Array.isArray(input.moments)
    ? input.moments
        .filter(isObject)
        .map((raw, index) => ({
          id: asText(raw.id, String(index + 1)),
          label: asText(raw.label),
          tense: asTense(raw.tense),
          requiredTimeConstraint: asOptionalText(raw.requiredTimeConstraint) ?? null,
          requiredAnyOf: asStringList(raw.requiredAnyOf),
          suggestAnyOf: asStringList(raw.suggestAnyOf),
          exampleAdverb: asOptionalText(raw.exampleAdverb),
          hint: asOptionalText(raw.hint),
        }))
    : []

  if (subjects.length === 0 || verbs.length === 0 || sentenceTypes.length === 0 || moments.length === 0) {
    return null
  }

  return { subjects, verbs, sentenceTypes, moments }
}

/**
 * Valida un JSON contra el esquema y devuelve los avisos legibles para el usuario.
 * `sanitizeData` hace el trabajo pesado; aquí sólo se explican los fallos.
 */
export function validateSchema(input: unknown): SchemaReport {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isObject(input)) {
    return { ok: false, errors: ['El contenido debe ser un objeto JSON de primer nivel.'], warnings }
  }

  for (const key of ['subjects', 'verbs', 'sentenceTypes', 'moments']) {
    if (!(key in input)) errors.push(`Falta la sección «${key}».`)
    else if (!Array.isArray(input[key])) errors.push(`«${key}» debe ser una lista.`)
    else if ((input[key] as unknown[]).length === 0) errors.push(`«${key}» no puede estar vacía.`)
  }
  if (errors.length > 0) return { ok: false, errors, warnings }

  const clean = sanitizeData(input)
  if (!clean) {
    return { ok: false, errors: ['La configuración no se pudo normalizar a un formato válido.'], warnings }
  }

  // Avisos de calidad: no impiden cargar, pero se muestran en el editor.
  clean.verbs.forEach((verb) => {
    if (!verb.verb) errors.push(`Un verbo no tiene forma base (campo "verb").`)
    if (!verb.object) warnings.push(`El verbo «${verb.verb || '?'}» no tiene objeto: la validación lo omitirá.`)
    if (!verb.past) warnings.push(`«${verb.verb}» no define "past": se usará la forma base.`)
    if (!verb.participle) warnings.push(`«${verb.verb}» no define "participle": se usará "past".`)
  })

  const seenVerbIds = new Set<string>()
  for (const verb of clean.verbs) {
    if (seenVerbIds.has(verb.id)) warnings.push(`Id duplicado en verbos: «${verb.id}».`)
    seenVerbIds.add(verb.id)
  }

  clean.moments.forEach((moment) => {
    if (!moment.label) errors.push(`Un momento no tiene "label" (Reel 4).`)
  })
  clean.sentenceTypes.forEach((type) => {
    if (!['affirmative', 'negative', 'interrogative'].includes(type.type)) {
      errors.push(`«${type.label || type.id}»: "type" debe ser affirmative, negative o interrogative.`)
    }
  })

  const hasNegative = clean.sentenceTypes.some((t) => t.type === 'negative')
  const hasQuestion = clean.sentenceTypes.some((t) => t.type === 'interrogative')
  if (!hasNegative) warnings.push('No hay tipos de oración negativos: el rodillo 3 sólo generará afirmativos.')
  if (!hasQuestion) warnings.push('No hay tipos interrogativos en el rodillo 3.')

  return { ok: errors.length === 0, errors, warnings }
}

/* -------------------------------------------------------------------------- */
/*                         Exportación / importación                          */
/* -------------------------------------------------------------------------- */

/** Descarga cualquier objeto serializable como fichero `.json`. */
export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** Descarga la configuración de los rodillos como fichero `.json`. */
export function downloadJson(data: ReelsData, filename = 'reelsData.json'): void {
  downloadJsonFile(data, filename)
}

/** Lee un `File` y devuelve su contenido parseado. */
export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text()
  return JSON.parse(text) as unknown
}