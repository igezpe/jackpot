import rawData from '../data/vocabularyData.json'
import { normalizeAnswerText } from './answerText'

export interface VocabItem {
  id: string
  spanish: string
  english: string
  variants: string[]
  category: string
  difficultyWeight: number
  /** Imagen principal (URL o ruta local). Si existe, manda sobre el emoji. */
  image?: string
  /** Pictograma de respaldo cuando no hay imagen. */
  emoji?: string
}

export interface VocabValidationResult {
  isValid: boolean
  feedback: string
  /** Forma que coincidió, si hubo. */
  matchedVariant?: string
  /** Respuestas aceptadas, para mostrar como ayuda. */
  accepted: string[]
}

export const DEFAULT_VOCAB: VocabItem[] = rawData as unknown as VocabItem[]

export const VOCAB_CATEGORIES = [
  'Expresiones fijas',
  'Sustantivos / Personas',
  'Cuerpo - Externo',
  'Cuerpo - Org. Internos',
  'Ropa',
  'Ropa interior',
  'Calzado',
  'Accesorios',
  'Negocios / Trabajo',
  'Tecnología',
  'Comida',
  'Viajes',
] as const

/** Respuestas aceptadas de un item (principal + variantes, sin repetir). */
export function acceptedAnswers(item: VocabItem): string[] {
  const all = [item.english, ...item.variants].map((v) => v.trim()).filter((v) => v.length > 0)
  return all.filter((v, i) => all.findIndex((o) => normalizeAnswerText(o) === normalizeAnswerText(v)) === i)
}

/**
 * Valida la traducción de un término. Tolerante a mayúsculas, espacios,
 * puntuación, contracciones y plurales/variantes listadas.
 */
export function validateVocabularyAnswer(answer: string, item: VocabItem): VocabValidationResult {
  const accepted = acceptedAnswers(item)
  const trimmed = answer.trim()
  if (trimmed.length === 0) {
    return { isValid: false, feedback: 'Escribe la traducción antes de comprobar.', accepted }
  }
  const norm = normalizeAnswerText(trimmed)
  const variant = accepted.find((v) => normalizeAnswerText(v) === norm)
  if (variant) {
    return { isValid: true, feedback: '¡Correcto! Buen vocabulario.', matchedVariant: variant, accepted }
  }
  return { isValid: false, feedback: 'No coincide con ninguna variante válida.', accepted }
}

/** Selección aleatoria ponderada por `difficultyWeight`. */
export function weightedPick(items: VocabItem[]): VocabItem {
  if (items.length === 0) throw new Error('No hay términos para elegir')
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
