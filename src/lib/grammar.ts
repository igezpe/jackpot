import type { Carrier, Tense, Verb } from '../types'
import { normalizeText } from './text'

/* -------------------------------------------------------------------------- */
/*                        Información de cada tiempo verbal                    */
/* -------------------------------------------------------------------------- */

export interface TenseInfo {
  key: Tense
  /** Nombre legible para el editor de configuración. */
  name: string
  /** Fórmula de la estructura, p. ej. "S + V(s)". */
  formula: string
  /** Forma que debe tomar el verbo principal en afirmativo. */
  verbForm: 'base' | 'ing' | 'past' | 'participle'
  /**
   * Forma del verbo principal cuando la oración es negativa o interrogativa y el
   * auxiliar ya lleva la marca (sólo afecta a los tiempos con "do-support").
   */
  verbFormAfterDo: 'base' | 'ing' | 'past' | 'participle'
  /** Auxiliar responsable de la marca del tiempo/negación. */
  carrier: Carrier
  /** Explicación corta en español. */
  hint: string
}

export const TENSE_INFO: Record<Tense, TenseInfo> = {
  present_simple: {
    key: 'present_simple',
    name: 'Present Simple',
    formula: 'S + V(s)',
    verbForm: 'base',
    verbFormAfterDo: 'base',
    carrier: 'do-present',
    hint: 'Hábitos, rutinas y hechos generales. En negativo y pregunta se apoya en do/does + infinitivo.',
  },
  present_continuous: {
    key: 'present_continuous',
    name: 'Present Continuous',
    formula: 'S + am/is/are + V-ing',
    verbForm: 'ing',
    verbFormAfterDo: 'ing',
    carrier: 'be-present',
    hint: 'Algo que está pasando en este momento. El verbo siempre va en -ing.',
  },
  past_simple: {
    key: 'past_simple',
    name: 'Past Simple',
    formula: 'S + V-ed / irregular',
    verbForm: 'past',
    verbFormAfterDo: 'base',
    carrier: 'do-past',
    hint: 'Acción terminada en el pasado. En negativo y pregunta: did + infinitivo (¡nunca el pasado!).',
  },
  past_continuous: {
    key: 'past_continuous',
    name: 'Past Continuous',
    formula: 'S + was/were + V-ing',
    verbForm: 'ing',
    verbFormAfterDo: 'ing',
    carrier: 'be-past',
    hint: 'Acción en curso en el pasado, interrumpida por otra.',
  },
  present_perfect: {
    key: 'present_perfect',
    name: 'Present Perfect',
    formula: 'S + have/has + participio',
    verbForm: 'participle',
    verbFormAfterDo: 'participle',
    carrier: 'have-present',
    hint: 'Pasado con consecuencias en el presente: already, yet, ever, never, since, for.',
  },
  past_perfect: {
    key: 'past_perfect',
    name: 'Past Perfect',
    formula: 'S + had + participio',
    verbForm: 'participle',
    verbFormAfterDo: 'participle',
    carrier: 'have-past',
    hint: 'La acción anterior a otra pasada. Sólo se conjuga con "had".',
  },
  future_will: {
    key: 'future_will',
    name: 'Future (will)',
    formula: 'S + will + V',
    verbForm: 'base',
    verbFormAfterDo: 'base',
    carrier: 'will',
    hint: 'Decisión instantánea, promesa o oferta hecha en el momento.',
  },
  future_going_to: {
    key: 'future_going_to',
    name: 'Future (going to)',
    formula: 'S + am/is/are going to + V',
    verbForm: 'base',
    verbFormAfterDo: 'base',
    carrier: 'going-to',
    hint: 'Plan o decisión tomada con antelación. Siempre tras "going to" va el infinitivo.',
  },
}

export const TENSE_LIST: TenseInfo[] = Object.values(TENSE_INFO)

/** Conjunto de auxiliares/marcadores que el motor reconoce en la respuesta. */
export const AUX_WORDS = new Set([
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'do',
  'does',
  'did',
  'done',
  'have',
  'has',
  'had',
  'will',
  'would',
  'shall',
  'should',
  'can',
  'could',
  'may',
  'might',
  'must',
  'going',
])

/** Palabras que delatan un tiempo verbal distinto al pedido. */
export const FUTURE_MARKERS = ['going', 'will', 'shall'] as const

/* -------------------------------------------------------------------------- */
/*                     Concordancia de sujeto (I / you / he...)                */
/* -------------------------------------------------------------------------- */

export interface SubjectInfo {
  /** ¿El sujeto es plural? */
  isPlural: boolean
  /** Forma de "to be" en presente: am / is / are. */
  be: string
  /** Forma de "to be" en pasado: was / were. */
  wasWere: string
  /** Perfecto presente: have / has. */
  have: string
  /** Verbo auxiliar: do / does. */
  doForm: string
}

const PLURAL_SUBJECTS = new Set(['you', 'we', 'they', 'both', 'these', 'those', 'people'])
const THIRD_SINGULAR = new Set(['he', 'she', 'it'])
const IRREGULAR_PLURALS = new Set([
  'people',
  'children',
  'men',
  'women',
  'folks',
  'guys',
  'kids',
  'friends',
  'parents',
  'students',
  'classmates',
  'cousins',
  'neighbours',
  'neighbors',
  'bosses',
  'ladies',
  'gentlemen',
])
/** Palabras terminadas en "s" que NO son plurales. */
const SINGULAR_S_LOOKALIKES = new Set([
  'is',
  'has',
  'was',
  'this',
  'his',
  'its',
  'us',
  'as',
  'news',
  'physics',
  'series',
  'always',
  'less',
  'yes',
  'business',
])

/**
 * Deduce la concordancia a partir del texto del sujeto (Reel 1).
 * Soporta pronombres y sintagmas nominales ("My friends", "The students").
 */
export function getSubjectInfo(subject: string): SubjectInfo {
  const normalized = normalizeText(subject).toLowerCase()
  const words = normalized.split(' ').filter(Boolean)

  if (normalized === 'i') {
    return { isPlural: false, be: 'am', wasWere: 'was', have: 'have', doForm: 'do' }
  }
  if (PLURAL_SUBJECTS.has(normalized)) {
    return { isPlural: true, be: 'are', wasWere: 'were', have: 'have', doForm: 'do' }
  }
  if (THIRD_SINGULAR.has(normalized)) {
    return { isPlural: false, be: 'is', wasWere: 'was', have: 'has', doForm: 'does' }
  }

  const head = words[0] ?? normalized
  const tail = words[words.length - 1] ?? normalized
  const isPlural =
    IRREGULAR_PLURALS.has(head) ||
    IRREGULAR_PLURALS.has(tail) ||
    (!SINGULAR_S_LOOKALIKES.has(head) && head.length > 1 && head.endsWith('s'))

  return isPlural
    ? { isPlural: true, be: 'are', wasWere: 'were', have: 'have', doForm: 'do' }
    : { isPlural: false, be: 'is', wasWere: 'was', have: 'has', doForm: 'does' }
}

/* -------------------------------------------------------------------------- */
/*                            Formas léxicas del verbo                          */
/* -------------------------------------------------------------------------- */

export interface VerbForms {
  base: string
  ing: string
  past: string
  participle: string
  third: string
}

/** buy → buying */
export function toIng(base: string): string {
  const v = base.toLowerCase()
  if (v.endsWith('ie')) return `${v.slice(0, -2)}ying`
  if (v.endsWith('e') && !v.endsWith('ee')) return `${v.slice(0, -1)}ing`
  // consonant doubling: buy → buying, stop → stopping
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(v)) return `${v}${v.slice(-1)}ing`
  return `${v}ing`
}

/** visit → visits, finish → finishes, study → studies */
export function toThird(base: string): string {
  const v = base.toLowerCase()
  if (/(s|x|z|ch|sh)$/.test(v)) return `${v}es`
  if (/(o)$/.test(v)) return `${v}es`
  if (v.endsWith('y') && !/[aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`
  return `${v}s`
}

/** Normaliza y resuelve las 5 formas del verbo, derivando las que falten. */
export function getVerbForms(verb: Verb): VerbForms {
  const base = normalizeText(verb.verb).toLowerCase()
  const past = normalizeText(verb.past).toLowerCase() || base
  return {
    base,
    ing: normalizeText(verb.ing ?? '').toLowerCase() || toIng(base),
    past,
    participle: normalizeText(verb.participle).toLowerCase() || past,
    third: normalizeText(verb.third ?? '').toLowerCase() || toThird(base),
  }
}

/** Devuelve la forma del verbo correspondiente a una etiqueta de `VerbForm`. */
export function formOf(forms: VerbForms, form: 'base' | 'ing' | 'past' | 'participle'): string {
  return forms[form]
}

/** ¿Es esta una forma verbal que NO corresponde al infinitivo? */