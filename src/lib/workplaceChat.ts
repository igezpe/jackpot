import rawData from '../data/workplaceChatData.json'
import { normalizeAnswerText } from './answerText'

export interface ChatPhrase {
  id: string
  spanish: string
  englishVariants: string[]
  category: string
  difficultyWeight: number
}

export interface ChatValidationResult {
  isValid: boolean
  feedback: string
  /** Variante que coincidió, si hubo. */
  matchedVariant?: string
  /** Primera variante válida, útil para mostrar la respuesta modelo. */
  model: string
}

export const DEFAULT_CHAT_PHRASES: ChatPhrase[] = rawData as unknown as ChatPhrase[]

/** Categorías sugeridas (el usuario puede escribir otras). */
export const CHAT_CATEGORIES = [
  'Chat rápido',
  'Confirmación',
  'Confirmación rápida',
  'Cortesía',
  'Petición',
  'Consultas técnicas',
  'Email / Chat',
  'Urgente',
  'Follow-up',
  'Greetings',
  'call',
  'Transporte',
  'Software',
  'Movimiento',
  'Guardias',
] as const

/** Normaliza para comparar respuestas (ver `answerText.ts`). */
export function normalizeChatText(input: string): string {
  return normalizeAnswerText(input)
}
/** ¿La variante (posiblemente abierta con "...") coincide con la respuesta? */
function matchesVariant(answerNorm: string, variant: string): boolean {
  const variantNorm = normalizeChatText(variant)
  if (variantNorm.length === 0) return false
  if (answerNorm === variantNorm) return true

  // Variantes abiertas terminadas en "...": basta con que una contenga a la otra.
  if (variant.trim().endsWith('...')) {
    const withoutDots = normalizeChatText(variant.replace(/\.\.\.+\s*$/, ''))
    if (withoutDots.length > 0 && (answerNorm.startsWith(withoutDots) || withoutDots.startsWith(answerNorm))) {
      return true
    }
  }
  return false
}

/** Valida una respuesta contra las variantes aceptadas de una frase. */
export function validateChatAnswer(answer: string, phrase: ChatPhrase): ChatValidationResult {
  const model = phrase.englishVariants[0] ?? ''
  const trimmed = answer.trim()
  if (trimmed.length === 0) {
    return { isValid: false, feedback: 'Escribe una respuesta antes de comprobar.', model }
  }
  const answerNorm = normalizeChatText(trimmed)
  const variant = phrase.englishVariants.find((v) => matchesVariant(answerNorm, v))
  if (variant) {
    return { isValid: true, feedback: '¡Respuesta aceptada!', matchedVariant: variant, model }
  }
  return {
    isValid: false,
    feedback: 'Todavía no coincide con ninguna variante válida.',
    model,
  }
}

/** Selección aleatoria ponderada por `difficultyWeight`. */
export function weightedPick(phrases: ChatPhrase[]): ChatPhrase {
  if (phrases.length === 0) {
    throw new Error('No hay frases para elegir')
  }
  const weights = phrases.map((p) => Math.max(0.0001, p.difficultyWeight))
  const total = weights.reduce((sum, w) => sum + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < phrases.length; i++) {
    r -= weights[i]!
    if (r <= 0) return phrases[i]!
  }
  return phrases[phrases.length - 1]!
}

/** Ajusta el peso de una frase tras un intento. */
export function nextWeight(current: number, correct: boolean): number {
  if (correct) return Math.max(1, current - 1)
  return current + 2
}
