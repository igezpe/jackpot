/**
 * Tipos de dominio del juego "Jackpot".
 *
 * Toda la configuración de los 4 rodillos vive en un único objeto `ReelsData`
 * que se serializa a JSON (ver `src/data/reelsData.json`). Esto permite que el
 * editor de la UI, la exportación y la importación trabajen siempre contra la
 * misma forma de datos.
 */

/** Tiempos verbales soportados por el motor de validación. */
export type Tense =
  | 'present_simple'
  | 'present_continuous'
  | 'past_simple'
  | 'past_continuous'
  | 'present_perfect'
  | 'past_perfect'
  | 'future_will'
  | 'future_going_to'

/** Polaridad de la oración (Reel 3). */
export type Polarity = 'affirmative' | 'negative' | 'interrogative'

/** Forma léxica que debe tomar el verbo principal según el tiempo verbal. */
export type VerbForm = 'base' | 'ing' | 'past' | 'participle'

/** Cómo se "carga" la marca de tiempo/negación: determina el auxiliar esperado. */
export type Carrier =
  | 'do-present' // presente simple → do / does
  | 'do-past' // pasado simple → did
  | 'be-present' // am / is / are
  | 'be-past' // was / were
  | 'have-present' // have / has
  | 'have-past' // had
  | 'will' // will
  | 'going-to' // be going to

/** Elemento del Reel 1. */
export type Subject = string

/** Elemento del Reel 2. */
export interface Verb {
  id: string
  /** Forma base (infinitivo), por ejemplo "Buy". */
  verb: string
  /** Complemento directo que debe aparecer en la oración, p. ej. "a car". */
  object: string
  /** Pasado simple, p. ej. "bought". */
  past: string
  /** Participio, p. ej. "bought" (necesario para los perfectos). */
  participle: string
  /** Opcional: gerundio. Si se omite se deriva de `verb`. */
  ing?: string
  /** Opcional: 3ª persona del singular, p. ej. "buys". Si se omite se deriva. */
  third?: string
}

/** Elemento del Reel 3. */
export interface SentenceType {
  id: string
  /** Texto mostrado en el rodillo, p. ej. "[ - ] Negative". */
  label: string
  type: Polarity
}

/** Elemento del Reel 4. */
export interface Moment {
  id: string
  /** Texto mostrado en el rodillo. */
  label: string
  tense: Tense
  /**
   * Conector de tiempo obligatorio, p. ej. "in January 2026".
   * `null` / ausente = no se exige ningún conector.
   */
  requiredTimeConstraint?: string | null
  /**
   * Al menos uno de estos marcadores debe aparecer (error si no aparece ninguno).
   * Útil para el presente perfecto sin referencia temporal ("already", "yet"...).
   */
  requiredAnyOf?: string[]
  /**
   * Marcadores recomendados. Su ausencia genera un *aviso*, nunca un error.
   */
  suggestAnyOf?: string[]
  /**
   * Complemento opcional que se añade a la oración de ejemplo que genera el
   * botón "Ver ejemplo" (p. ej. "every day").
   */
  exampleAdverb?: string
  /** Explicación en español que se muestra bajo el rodillo 4. */
  hint?: string
}

/** Configuración completa de los 4 rodillos. */
export interface ReelsData {
  subjects: Subject[]
  verbs: Verb[]
  sentenceTypes: SentenceType[]
  moments: Moment[]
}

/** Combinación resultante de una tirada. */
export interface Combo {
  subject: Subject
  verb: Verb
  sentenceType: SentenceType
  moment: Moment
}