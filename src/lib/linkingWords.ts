import rawData from '../data/linkingWordsData.json'
import { normalizeAnswerText } from './answerText'

export interface LinkingWordItem {
  id: string
  /** Primera oración / contexto base. */
  ideaA: string
  /** Segunda oración que se une con el conector. */
  ideaB: string
  /** Tipo de relación (contrast, addition, result, condition…). */
  relationType: string
  /** Etiqueta visible de la relación, con pista en español. */
  relationLabel: string
  /** Conectores válidos. El primero es el correcto que se ofrece como opción. */
  validConnectors: string[]
  /** Oración completa de ejemplo (usa el primer conector). */
  exampleFullSentence: string
  category: string
  difficultyWeight: number
}

export interface LinkingSelectionResult {
  isCorrect: boolean
  selected: string
  correct: string
  fullSentence: string
}

export const DEFAULT_LINKING_WORDS: LinkingWordItem[] =
  rawData as unknown as LinkingWordItem[]

/** Tipos de relación sugeridos (el usuario puede escribir otros). */
export const RELATION_TYPES = [
  'contrast',
  'addition',
  'result',
  'condition',
  'cause',
  'example',
  'sequence',
  'conclusion',
] as const

/** Conectores de reserva para completar las opciones si el mazo es muy chico. */
const FALLBACK_CONNECTORS = [
  'however',
  'therefore',
  'also',
  'otherwise',
  'so',
  'but',
  'besides',
  'in addition',
  'as a result',
  'on the other hand',
]

export interface LinkingRound {
  options: string[]
  correct: string
}

function shuffle<T>(values: T[]): T[] {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = tmp
  }
  return copy
}

const COORDINATING_CONNECTORS = new Set(['but', 'so', 'and', 'or', 'yet', 'for', 'nor', 'or else'])
const NO_COMMA_AFTER = new Set([
  'that is why',
  'this is why',
  'which is why',
  'because',
  'since',
  'as',
  'although',
  'though',
])

function stripEnd(text: string): string {
  return text.trim().replace(/[.!?]+$/, '')
}

/** Oración completa con el conector elegido (usa el ejemplo si es el primero). */
export function buildFullSentence(item: LinkingWordItem, connector: string): string {
  const first = item.validConnectors[0]?.trim() ?? ''
  if (
    item.exampleFullSentence.trim() &&
    normalizeAnswerText(connector) === normalizeAnswerText(first)
  ) {
    return item.exampleFullSentence.trim()
  }
  const a = stripEnd(item.ideaA)
  const b = stripEnd(item.ideaB)
  if (!a || !b) return item.exampleFullSentence.trim()
  const lower = connector.charAt(0).toLowerCase() + connector.slice(1)
  const norm = normalizeAnswerText(connector)
  let sentence: string
  if (COORDINATING_CONNECTORS.has(norm)) {
    sentence = `${a}, ${lower} ${b}.`
  } else if (NO_COMMA_AFTER.has(norm)) {
    const capitalized = connector.charAt(0).toUpperCase() + connector.slice(1)
    sentence = `${a}. ${capitalized} ${b}.`
  } else {
    sentence = `${a}; ${lower}, ${b}.`
  }
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

/**
 * Prepara una ronda: elige **al azar** uno de los conectores válidos como
 * correcto y arma 4 opciones con 3 distractores de otras relaciones.
 */
export function buildRound(item: LinkingWordItem, all: LinkingWordItem[]): LinkingRound {
  const valid = item.validConnectors.map((c) => c.trim()).filter((c) => c.length > 0)
  const correct = valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)]! : ''
  if (!correct) return { options: [], correct }

  const normalizedValid = new Set(valid.map((c) => normalizeAnswerText(c)))
  const seen = new Set<string>()
  const pool: string[] = []

  const push = (connector: string) => {
    const norm = normalizeAnswerText(connector)
    if (!norm || normalizedValid.has(norm) || seen.has(norm)) return
    seen.add(norm)
    pool.push(connector.trim())
  }

  // 1) Distractores de otras relaciones.
  for (const other of all) {
    if (other.relationType === item.relationType) continue
    other.validConnectors.forEach(push)
  }
  // 2) Si faltan, completar con cualquier otro conector del mazo.
  if (pool.length < 3) {
    for (const other of all) other.validConnectors.forEach(push)
  }
  // 3) Último recurso: conectores genéricos.
  if (pool.length < 3) FALLBACK_CONNECTORS.forEach(push)

  const distractors = shuffle(pool).slice(0, 3)
  return { options: shuffle([correct, ...distractors]), correct }
}

/** Evalúa la opción elegida contra el conector correcto de la ronda. */
export function evaluateLinkingSelection(
  selected: string,
  item: LinkingWordItem,
  correct: string,
): LinkingSelectionResult {
  return {
    isCorrect: normalizeAnswerText(selected) === normalizeAnswerText(correct),
    selected,
    correct,
    fullSentence: buildFullSentence(item, correct),
  }
}

/** Selección aleatoria ponderada por `difficultyWeight`. */
export function weightedPick(items: LinkingWordItem[]): LinkingWordItem {
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
