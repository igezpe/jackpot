import rawDefault from '../data/conditionalsData.json'
import type {
  ConditionalCondition,
  ConditionalData,
  ConditionalPolarity,
  ConditionalResult,
  ConditionalSubject,
  ConditionalType,
  ConditionalUsage,
  VerbForms,
} from './conditionals'

/** Estado inicial de condicionales, tomado de `src/data/conditionalsData.json`. */
export const DEFAULT_CONDITIONAL_DATA: ConditionalData = rawDefault as unknown as ConditionalData

/** Clave de localStorage donde se guardan las personalizaciones de condicionales. */
export const CONDITIONAL_STORAGE_KEY = 'jackpot.conditionalsData.v1'

const TYPES = new Set<string>(['zero', 'first', 'second', 'third'])

/* -------------------------------------------------------------------------- */
/*                            Lectura / escritura                             */
/* -------------------------------------------------------------------------- */

export function loadConditionalsFromStorage(): ConditionalData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONDITIONAL_STORAGE_KEY)
    if (!raw) return null
    return sanitizeConditionalData(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function saveConditionalsToStorage(data: ConditionalData): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(CONDITIONAL_STORAGE_KEY, JSON.stringify(data, null, 2))
    return true
  } catch {
    return false
  }
}

export function clearConditionalsStorage(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CONDITIONAL_STORAGE_KEY)
  } catch {
    /* sin almacenamiento disponible */
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Saneado                                   */
/* -------------------------------------------------------------------------- */

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback

const asOptionalText = (value: unknown): string | undefined => {
  const text = asText(value)
  return text.length > 0 ? text : undefined
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => asText(item)).filter((item) => item.length > 0)
}

const asType = (value: unknown): ConditionalType => {
  const text = asText(value, 'first')
  return (TYPES.has(text) ? text : 'first') as ConditionalType
}

function asVerb(value: unknown): VerbForms {
  const raw = isObject(value) ? value : {}
  return {
    base: asText(raw.base),
    third: asText(raw.third),
    past: asText(raw.past),
    participle: asText(raw.participle),
  }
}

export function sanitizeConditionalData(input: unknown): ConditionalData | null {
  if (!isObject(input)) return null

  const usages: ConditionalUsage[] = Array.isArray(input.usages)
    ? input.usages.filter(isObject).map((raw, index) => ({
        id: asText(raw.id, `u${index + 1}`),
        label: asText(raw.label),
        conditionalType: asType(raw.conditionalType),
        description: asText(raw.description),
      }))
    : []

  const subjects: ConditionalSubject[] = Array.isArray(input.subjects)
    ? input.subjects.filter(isObject).map((raw, index) => ({
        id: asText(raw.id, `s${index + 1}`),
        label: asText(raw.label),
        allowedConditions: asStringArray(raw.allowedConditions),
      }))
    : []

  const conditions: ConditionalCondition[] = Array.isArray(input.conditions)
    ? input.conditions.filter(isObject).map((raw, index) => ({
        id: asText(raw.id, `c${index + 1}`),
        conditionalType: asType(raw.conditionalType),
        verb: asVerb(raw.verb),
        complement: asText(raw.complement),
        allowedSubjects: asStringArray(raw.allowedSubjects),
        compatibleResults: asStringArray(raw.compatibleResults),
      }))
    : []

  const results: ConditionalResult[] = Array.isArray(input.results)
    ? input.results.filter(isObject).map((raw) => ({
        id: asText(raw.id),
        conditionalType: asType(raw.conditionalType),
        verb: asVerb(raw.verb),
        complement: asText(raw.complement),
        resultSubject: asOptionalText(raw.resultSubject),
      }))
    : []

  const polarities: ConditionalPolarity[] = Array.isArray(input.polarities)
    ? input.polarities.filter(isObject).map((raw, index) => ({
        id: asText(raw.id, `p${index + 1}`),
        label: asText(raw.label),
      }))
    : []

  if (
    usages.length === 0 ||
    subjects.length === 0 ||
    conditions.length === 0 ||
    results.length === 0 ||
    polarities.length === 0
  ) {
    return null
  }

  return { usages, subjects, conditions, results, polarities }
}

/* -------------------------------------------------------------------------- */
/*                                 Validación                                 */
/* -------------------------------------------------------------------------- */

export interface ConditionalSchemaReport {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function validateConditionalSchema(input: unknown): ConditionalSchemaReport {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isObject(input)) {
    return { ok: false, errors: ['El contenido debe ser un objeto JSON de primer nivel.'], warnings }
  }

  for (const key of ['usages', 'subjects', 'conditions', 'results', 'polarities']) {
    if (!(key in input)) errors.push(`Falta la sección «${key}».`)
    else if (!Array.isArray(input[key])) errors.push(`«${key}» debe ser una lista.`)
    else if ((input[key] as unknown[]).length === 0) errors.push(`«${key}» no puede estar vacía.`)
  }
  if (errors.length > 0) return { ok: false, errors, warnings }

  const clean = sanitizeConditionalData(input)
  if (!clean) {
    return { ok: false, errors: ['La configuración no se pudo normalizar a un formato válido.'], warnings }
  }

  if (clean.conditions.some((c) => !c.verb.base)) {
    warnings.push('Hay condiciones sin verbo base (campo "verb.base").')
  }
  if (clean.results.some((r) => !r.verb.base)) {
    warnings.push('Hay resultados sin verbo base (campo "verb.base").')
  }

  const resultIds = new Set(clean.results.map((r) => r.id))
  const missing = clean.conditions.flatMap((c) =>
    c.compatibleResults.filter((id) => !resultIds.has(id)).map((id) => `${c.id} → ${id}`),
  )
  if (missing.length > 0) {
    warnings.push(`Resultados compatibles inexistentes: ${missing.join(', ')}.`)
  }

  return { ok: errors.length === 0, errors, warnings }
}
