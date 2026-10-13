import rawData from '../data/ordersRequestsData.json'
import { normalizeAnswerText } from './answerText'

export interface OrderRequestItem {
  id: string
  directSentence: string
  introContext: string
  expectedVariants: string[]
  category: string
  difficultyWeight: number
}

export interface OrderRequestValidationResult {
  isValid: boolean
  feedback: string
  matchedVariant?: string
  accepted: string[]
}

export const DEFAULT_ORDERS_REQUESTS: OrderRequestItem[] = rawData as unknown as OrderRequestItem[]

export const OR_CATEGORIES = ['Order [+]', 'Order [-]', 'Request [+]', 'Request [-]'] as const

/** Respuestas aceptadas (sin repetir). */
export function acceptedVariants(item: OrderRequestItem): string[] {
  const all = item.expectedVariants.map((v) => v.trim()).filter((v) => v.length > 0)
  return all.filter((v, i) => all.findIndex((o) => normalizeAnswerText(o) === normalizeAnswerText(v)) === i)
}

/** Norma y quita el "..." final del introductor. */
function introCore(intro: string): string {
  return normalizeAnswerText(intro.replace(/\.\.\.+\s*$/, '')).trim()
}

/** Quita el prefijo del introductor si la frase empieza con él. */
function withoutIntro(text: string, introNorm: string): string {
  const norm = normalizeAnswerText(text)
  return introNorm.length > 0 && norm.startsWith(introNorm) ? norm.slice(introNorm.length).trim() : norm
}

/**
 * Valida la transformación a Reported Speech. Tolerante:
 *  - acepta la variante completa o solo la cláusula ("to send him..." / "not to change...");
 *  - acepta que el introductor esté o no, e incluso con otro introductor, mientras
 *    la cláusula transformada coincida.
 */
export function validateOrderAnswer(
  answer: string,
  item: OrderRequestItem,
): OrderRequestValidationResult {
  const accepted = acceptedVariants(item)
  const trimmed = answer.trim()
  if (trimmed.trim().length === 0) {
    return { isValid: false, feedback: 'Escribe la transformación antes de comprobar.', accepted }
  }

  const introNorm = introCore(item.introContext)
  const answerNorm = normalizeAnswerText(trimmed)
  const answerCore = withoutIntro(trimmed, introNorm)

  for (const variant of accepted) {
    if (normalizeAnswerText(variant) === answerNorm) {
      return { isValid: true, feedback: '¡Correcto! Buena transformación.', matchedVariant: variant, accepted }
    }
  }

  // Comparar solo la cláusula transformada (con o sin introductor).
  for (const variant of accepted) {
    const variantCore = withoutIntro(variant, introNorm)
    if (variantCore.length > 0 && variantCore === answerCore) {
      return { isValid: true, feedback: '¡Correcto! Buena transformación.', matchedVariant: variant, accepted }
    }
  }

  return { isValid: false, feedback: 'No coincide con ninguna variante válida.', accepted }
}

/** Selección aleatoria ponderada por `difficultyWeight`. */
export function weightedPick(items: OrderRequestItem[]): OrderRequestItem {
  if (items.length === 0) throw new Error('No hay ítems para elegir')
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
