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

/** Pasado/participio de verbos irregulares frecuentes (base → formas extra). */
const IRREGULAR_VERBS: Record<string, string[]> = {
  go: ['went', 'gone', 'goes'],
  come: ['came', 'comes'],
  take: ['took', 'taken', 'takes'],
  find: ['found', 'finds'],
  run: ['ran', 'runs'],
  bring: ['brought', 'brings'],
  put: ['put', 'puts'],
  leave: ['left', 'leaves'],
  win: ['won', 'wins'],
  buy: ['bought', 'buys'],
  get: ['got', 'gotten', 'gets'],
  have: ['had', 'has'],
  make: ['made', 'makes'],
  see: ['saw', 'seen', 'sees'],
  do: ['did', 'done', 'does'],
  read: ['read', 'reads'],
  write: ['wrote', 'written', 'writes'],
  give: ['gave', 'given', 'gives'],
  know: ['knew', 'known', 'knows'],
  think: ['thought', 'thinks'],
  keep: ['kept', 'keeps'],
  hold: ['held', 'holds'],
  say: ['said', 'says'],
  pay: ['paid', 'pays'],
  meet: ['met', 'meets'],
  send: ['sent', 'sends'],
  build: ['built', 'builds'],
  lose: ['lost', 'loses'],
  catch: ['caught', 'catches'],
  teach: ['taught', 'teaches'],
  set: ['set', 'sets'],
  cut: ['cut', 'cuts'],
  let: ['let', 'lets'],
  shut: ['shut', 'shuts'],
  break: ['broke', 'broken', 'breaks'],
  choose: ['chose', 'chosen', 'chooses'],
  drive: ['drove', 'driven', 'drives'],
  eat: ['ate', 'eaten', 'eats'],
  fall: ['fell', 'fallen', 'falls'],
  feel: ['felt', 'feels'],
  forget: ['forgot', 'forgotten', 'forgets'],
  grow: ['grew', 'grown', 'grows'],
  hear: ['heard', 'hears'],
  hide: ['hid', 'hidden', 'hides'],
  hit: ['hit', 'hits'],
  hurt: ['hurt', 'hurts'],
  mean: ['meant', 'means'],
  quit: ['quit', 'quits'],
  ride: ['rode', 'ridden', 'rides'],
  ring: ['rang', 'rung', 'rings'],
  rise: ['rose', 'risen', 'rises'],
  sell: ['sold', 'sells'],
  shake: ['shook', 'shaken', 'shakes'],
  show: ['showed', 'shown', 'shows'],
  sing: ['sang', 'sung', 'sings'],
  sit: ['sat', 'sits'],
  speak: ['spoke', 'spoken', 'speaks'],
  spend: ['spent', 'spends'],
  stand: ['stood', 'stands'],
  steal: ['stole', 'stolen', 'steals'],
  swim: ['swam', 'swum', 'swims'],
  throw: ['threw', 'thrown', 'throws'],
  understand: ['understood', 'understands'],
  wake: ['woke', 'woken', 'wakes'],
  wear: ['wore', 'worn', 'wears'],
}

/** Patrón consonante-vocal-consonante final (para doblar: put → putting). */
const CVC = /[^aeiou][aeiou][^aeiouwxy]$/

/** Formas aceptables de la primera palabra (base, 3ª persona, -ing, pasado). */
function verbForms(base: string): Set<string> {
  const w = base.toLowerCase()
  const forms = new Set<string>([w])
  if (/(s|x|z|ch|sh|o)$/.test(w)) forms.add(`${w}es`)
  else if (/[^aeiou]y$/.test(w)) forms.add(`${w.slice(0, -1)}ies`)
  else forms.add(`${w}s`)

  // -ing (con doblado si corresponde)
  if (w.endsWith('e') && !w.endsWith('ee')) {
    forms.add(`${w.slice(0, -1)}ing`)
  } else {
    if (CVC.test(w)) forms.add(`${w}${w.slice(-1)}ing`)
    forms.add(`${w}ing`)
  }

  // Pasado / participio
  const irregular = IRREGULAR_VERBS[w]
  if (irregular) {
    irregular.forEach((form) => forms.add(form))
  } else if (w.endsWith('e')) {
    forms.add(`${w}d`)
  } else if (/[^aeiou]y$/.test(w)) {
    forms.add(`${w.slice(0, -1)}ied`)
  } else {
    if (CVC.test(w)) forms.add(`${w}${w.slice(-1)}ed`)
    forms.add(`${w}ed`)
  }
  return forms
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

  // 2) Tolerancia: misma partícula Y el verbo debe ser una conjugación del esperado.
  for (const candidate of accepted) {
    const cand = tokens(candidate)

    // Variante de una sola palabra: admite conjugaciones (cancel → cancelled).
    if (cand.length === 1) {
      if (ans.length === 1 && verbForms(cand[0]!).has(ans[0]!)) {
        return { isValid: true, feedback: '¡Correcto! Buen phrasal verb.', matchedVariant: candidate, accepted }
      }
      continue
    }

    // Variante de varias palabras: misma cola (partícula) y verbo conjugado del correcto.
    if (cand.length === ans.length && ans.slice(1).join(' ') === cand.slice(1).join(' ')) {
      if (verbForms(cand[0]!).has(ans[0]!)) {
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
