import rawData from '../data/phrasalVerbsData.json'
import { normalizeAnswerText } from './answerText'

export interface PhrasalVerbItem {
  id: string
  spanish: string
  phrasalVerb: string
  variants: string[]
  exampleContext: string
  category: string
  difficultyWeight: number
}

export interface PhrasalValidationResult {
  isValid: boolean
  feedback: string
  /** Forma que coincidió, si hubo. */
  matchedVariant?: string
  /** Respuestas aceptadas para mostrar como ayuda. */
  accepted: string[]
}

export const DEFAULT_PHRASAL_VERBS: PhrasalVerbItem[] = rawData as unknown as PhrasalVerbItem[]

export const PHRASAL_CATEGORIES = [
  'Documentos / Revisión',
  'Análisis / Problemas',
  'Responsabilidades',
  'Reuniones / Ideas',
  'Planificación',
  'Liderazgo / Roles',
  'Búsqueda / Aprendizaje',
  'Investigación',
  'Recursos / Tiempo',
  'Comunicación',
] as const

/** Respuestas aceptadas de un item (el principal + sus variantes, sin repetir). */
export function acceptedAnswers(item: PhrasalVerbItem): string[] {
  const all = [item.phrasalVerb, ...item.variants].map((v) => v.trim()).filter((v) => v.length > 0)
  return all.filter((v, i) => all.findIndex((o) => normalizeAnswerText(o) === normalizeAnswerText(v)) === i)
}

/** Tokens normalizados, sin el "to" inicial. */
function tokens(input: string): string[] {
  return normalizeAnswerText(input).replace(/^to /, '').split(' ').filter(Boolean)
}

/**
 * Valida un phrasal verb. Tolerante:
 *  - coincide exactamente con el principal o una variante;
 *  - o mantiene la partícula/preposición y solo cambia el verbo (p. ej. «came up with» ≈ «come up with»).
 */
export function validatePhrasalAnswer(answer: string, item: PhrasalVerbItem): PhrasalValidationResult {
  const accepted = acceptedAnswers(item)
  const trimmed = answer.trim()
  if (trimmed.length === 0) {
    return { isValid: false, feedback: 'Escribe el phrasal verb antes de comprobar.', accepted }
  }

  const ans = tokens(trimmed)
  const ansStr = ans.join(' ')

  // 1) Coincidencia exacta (normalizada).
  for (const candidate of accepted) {
    if (tokens(candidate).join(' ') === ansStr) {
      return { isValid: true, feedback: '¡Correcto! Buen phrasal verb.', matchedVariant: candidate, accepted }
    }
  }

  // 2) Tolerancia por partícula: misma cantidad de palabras y misma cola (sin el verbo).
  for (const candidate of accepted) {
    const cand = tokens(candidate)
    if (cand.length >= 2 && cand.length === ans.length) {
      const tail = cand.slice(1).join(' ')
      if (ans.slice(1).join(' ') === tail) {
        return { isValid: true, feedback: '¡Correcto! La partícula es la clave.', matchedVariant: candidate, accepted }
      }
    }
  }

  return { isValid: false, feedback: 'No coincide con ninguna variante válida.', accepted }
}

/** Selección aleatoria ponderada por `difficultyWeight`. */
export function weightedPick(items: PhrasalVerbItem[]): PhrasalVerbItem {
  if (items.length === 0) throw new Error('No hay phrasal verbs para elegir')
  const weights = items.map((p) => Math.max(0.0001, p.difficultyWeight))
  const total = weights.reduce((sum, w) => sum + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!
    if (r <= 0) return items[i]!
  }
  return items[items.length - 1]!
}

/** Ajusta el peso tras un intento. */
export function nextWeight(current: number, correct: boolean): number {
  if (correct) return Math.max(1, current - 1)
  return current + 2
}

/** Frase de contexto con el hueco rellenado. */
export function fillContext(item: PhrasalVerbItem, value: string): string {
  return item.exampleContext.replace(/_{2,}/, value)
}
