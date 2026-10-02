import type { Combo, Polarity, Tense } from '../types'
import {
  AUX_WORDS,
  TENSE_INFO,
  getSubjectInfo,
  getVerbForms,
  type SubjectInfo,
  type TenseInfo,
  type VerbForms,
} from './grammar'
import { containsAnyPhrase, findPhrase, findTokenPhrase, normalizeText, tokenize } from './text'

/* -------------------------------------------------------------------------- */
/*                                    Tipos                                    */
/* -------------------------------------------------------------------------- */

export type IssueKind = 'error' | 'warning'

export interface Issue {
  code: string
  kind: IssueKind
  /** Explicación en español, ya con las palabras concretas entrecomilladas. */
  message: string
}

export interface ValidationResult {
  valid: boolean
  issues: Issue[]
  errors: Issue[]
  warnings: Issue[]
  /** Oración modelo correcta para esta combinación. */
  example: string
}

type FormKey = keyof VerbForms

/* -------------------------------------------------------------------------- */
/*                              Tablas auxiliares                              */
/* -------------------------------------------------------------------------- */

/** Cómo se nombra cada forma verbal en los mensajes de error. */
const FORM_LABEL: Record<FormKey, string> = {
  base: 'infinitivo',
  third: '3ª persona del singular',
  ing: 'gerundio (-ing)',
  past: 'pasado simple',
  participle: 'participio',
}

/**
 * Marcadores que delatan que se ha usado un tiempo verbal distinto al pedido.
 * Sólo se evalúan cuando la palabra no forma parte de la estructura esperada.
 */
interface MarkerRule {
  /** Cualquiera de estas palabras delata un tiempo verbal equivocado. */
  words: readonly string[]
  message: string
}

const FUTURE_WORDS = ['going', 'will', 'shall'] as const
const PERFECT_WORDS = ['have', 'has', 'had'] as const

const TENSE_MARKER_RULES: Partial<Record<Tense, MarkerRule[]>> = {
  present_simple: [
    {
      words: FUTURE_WORDS,
      message: '«going to» / «will» hablan del futuro; este rodillo pide presente simple.',
    },
    {
      words: PERFECT_WORDS,
      message: '«have / has / had» forma el tiempo perfecto; en presente simple el verbo va solo, sin auxiliar.',
    },
  ],
  past_simple: [
    {
      words: FUTURE_WORDS,
      message: '«going to» / «will» hablan del futuro; este rodillo pide pasado simple.',
    },
    {
      words: PERFECT_WORDS,
      message: '«have / has / had» forma el tiempo perfecto; el pasado simple es el verbo solo, o «did» + infinitivo.',
    },
  ],
  present_continuous: [
    {
      words: ['was', 'were'],
      message: '«was / were» es pasado continuo; para el presente continuo usa «am / is / are».',
    },
    {
      words: PERFECT_WORDS,
      message: '«have / has / had» forma el tiempo perfecto; el presente continuo usa «am / is / are» + -ing.',
    },
  ],
  past_continuous: [
    {
      words: PERFECT_WORDS,
      message: '«have / has / had» forma el tiempo perfecto; el pasado continuo usa «was / were» + -ing.',
    },
  ],
  future_going_to: [
    {
      words: ['will', 'shall'],
      message: '«will» es decisión instantánea; para un plan usa «going to».',
    },
    {
      words: PERFECT_WORDS,
      message: '«have / has / had» es un tiempo perfecto; para un plan usa «going to» + infinitivo.',
    },
  ],
  future_will: [
    {
      words: ['going'],
      message: '«going to» es un plan o decisión previa; para una decisión instantánea usa «will».',
    },
    {
      words: PERFECT_WORDS,
      message: '«have / has / had» es un tiempo perfecto; para el futuro usa «will» + infinitivo.',
    },
  ],
}

/* -------------------------------------------------------------------------- */
/*                         Plan de auxiliares por combinación                  */
/* -------------------------------------------------------------------------- */

interface AuxPlan {
  /** Tokens que deben aparecer, en orden. `[]` = sin auxiliar (afirmativo simple). */
  expected: string[]
  /** Cómo se escribe el auxiliar cuando la frase va en negativo. */
  negativeLabel: string
  /** Etiqueta legible del auxiliar. */
  label: string
}

/** Calcula el auxiliar exigido por el tiempo + polaridad + sujeto. */
function planAux(ti: TenseInfo, si: SubjectInfo, polarity: Polarity): AuxPlan {
  const neg = polarity === 'negative'
  const q = polarity === 'interrogative'

  switch (ti.carrier) {
    case 'do-present':
      if (!neg && !q) return { expected: [], negativeLabel: '', label: '' }
      return {
        expected: [si.doForm],
        negativeLabel: si.doForm === 'does' ? "doesn't" : "don't",
        label: si.doForm,
      }
    case 'do-past':
      if (!neg && !q) return { expected: [], negativeLabel: '', label: '' }
      return { expected: ['did'], negativeLabel: "didn't", label: 'did' }
    case 'be-present':
      return {
        expected: [si.be],
        negativeLabel: si.be === 'am' ? 'am not' : si.be === 'is' ? "isn't" : "aren't",
        label: si.be,
      }
    case 'be-past':
      return {
        expected: [si.wasWere],
        negativeLabel: si.wasWere === 'was' ? "wasn't" : "weren't",
        label: si.wasWere,
      }
    case 'have-present':
      return {
        expected: [si.have],
        negativeLabel: si.have === 'have' ? "haven't" : "hasn't",
        label: si.have,
      }
    case 'have-past':
      return { expected: ['had'], negativeLabel: "hadn't", label: 'had' }
    case 'will':
      return { expected: ['will'], negativeLabel: "won't", label: 'will' }
    case 'going-to':
      return {
        expected: [si.be, 'going', 'to'],
        negativeLabel: si.be === 'am' ? 'am not' : si.be === 'is' ? "isn't" : "aren't",
        label: `${si.be} going to`,
      }
  }
}

/** Forma del verbo principal que se espera. */
function planVerbForm(ti: TenseInfo, si: SubjectInfo, polarity: Polarity): FormKey {
  const needsDoSupport =
    (ti.carrier === 'do-present' || ti.carrier === 'do-past') &&
    (polarity === 'negative' || polarity === 'interrogative')

  if (needsDoSupport) return ti.verbFormAfterDo
  if (ti.key === 'present_simple') return si.doForm === 'does' ? 'third' : 'base'
  return ti.verbForm as FormKey
}

/* -------------------------------------------------------------------------- */
/*                                  Auxiliares                                 */
/* -------------------------------------------------------------------------- */

function error(code: string, message: string): Issue {
  return { code, kind: 'error', message }
}
function warn(code: string, message: string): Issue {
  return { code, kind: 'warning', message }
}

/** Localiza el primer token que pertenece a `words`. */
function indexOfAny(tokens: readonly string[], words: ReadonlySet<string>): number {
  for (let i = 0; i < tokens.length; i++) if (words.has(tokens[i])) return i
  return -1
}

/* -------------------------------------------------------------------------- */
/*                            Validador principal                              */
/* -------------------------------------------------------------------------- */

export function validate(answer: string, combo: Combo, allSubjects: readonly string[] = []): ValidationResult {
  const issues: Issue[] = []
  const clean = normalizeText(answer)

  const push = (issue: Issue) => issues.push(issue)

  if (clean.length === 0) {
    const empty = error('empty', 'Escribe una oración antes de comprobar.')
    return { valid: false, issues: [empty], errors: [empty], warnings: [], example: buildExample(combo) }
  }

  const tokens = tokenize(clean)
  const { subject, verb, sentenceType, moment } = combo
  const ti = TENSE_INFO[moment.tense] ?? TENSE_INFO.present_simple
  const si = getSubjectInfo(subject)
  const forms = getVerbForms(verb)
  const polarity = sentenceType.type
  const isQuestion = polarity === 'interrogative'
  const isNegative = polarity === 'negative'

  /* ---------------------------------------------------------------- 1. Sujeto */

  const subjectTokens = tokenize(subject)
  const subjectIdx = subjectTokens.length ? findTokenPhrase(tokens, subjectTokens) : -1

  if (subjectIdx === -1) {
    // ¿Aparece otro sujeto conocido? -> mensaje mucho más útil.
    const intruder = allSubjects
      .map((candidate) => tokenize(candidate))
      .find((candidate) => candidate.length > 0 && findTokenPhrase(tokens, candidate) !== -1)

    if (intruder) {
      const text = intruder.join(' ')
      push(
        error(
          'subject_wrong',
          `El sujeto de esta tirada es «${subject}», no «${text}». Vuelve a mirar el primer rodillo.`,
        ),
      )
    } else {
      push(error('subject_missing', `Falta el sujeto «${subject}» al principio de la oración.`))
    }
  } else {
    if (isQuestion && subjectIdx === 0) {
      push(
        error(
          'subject_order_question',
          `En una pregunta el auxiliar va primero: «${cap(expectedAuxWord(ti, si))} ${subject.toLowerCase()} ...?»`,
        ),
      )
    } else if (!isQuestion && subjectIdx !== 0) {
      push(error('subject_order', `El sujeto va al principio de la frase, antes de todo.`))
    }
  }

  /* ------------------------------------------------------- 2. Polaridad (not) */

  const notIdx = tokens.indexOf('not')
  const hasNever = tokens.includes('never')
  const polarityPlan = planAux(ti, si, polarity)
  let negationMissing = false

  if (isNegative && notIdx === -1 && !hasNever) {
    negationMissing = true
    push(
      error(
        'negation_missing',
        `Esta combinación pide una frase negativa. Usa «${polarityPlan.negativeLabel}» y pon «not» justo después del auxiliar.`,
      ),
    )
  }
  if (!isNegative && notIdx !== -1) {
    push(
      error(
        'negation_unexpected',
        isQuestion
          ? 'Esta combinación pide una pregunta sin negación: quita el «not».'
          : 'Esta combinación pide una frase afirmativa: quita el «not».',
      ),
    )
  }

  /* ------------------------------------------------------------ 3. Auxiliar */

  const plan = planAux(ti, si, polarity)
  let auxIdx = -1

  if (plan.expected.length === 0) {
    // Afirmativo simple: no debe aparecer do/does/did.
    const stray = tokens.find((t) => t === 'do' || t === 'does' || t === 'did')
    if (stray) {
      push(
        error(
          'aux_unexpected',
          `En afirmativo no se usa «${stray}»: basta con el sujeto y el verbo (${ti.formula}).`,
        ),
      )
    }
  } else {
    auxIdx = tokens.indexOf(plan.expected[0])

    if (auxIdx === -1) {
      const alternative = tokens.find((t) => AUX_WORDS.has(t))
      if (alternative) {
        push(
          error(
            'aux_wrong',
            agreementMessage(alternative, plan.expected[0], si, subject),
          ),
        )
      } else if (negationMissing) {
        // El mensaje de negación ya explica qué auxiliar usar: no se repite.
      } else {
        push(error('aux_missing', `Falta el auxiliar «${plan.label}» (${ti.formula}).`))
      }
    } else if (isQuestion && auxIdx !== 0) {
      push(
        warn(
          'aux_not_first',
          `En una pregunta el auxiliar abre la frase: «${cap(plan.label)} ${subject.toLowerCase()} ...?».`,
        ),
      )
    }

    // Secuencia completa del auxiliar: "am/is/are going to".
    // Entre la palabra auxiliar y el resto de la locución pueden intercalarse
    // el "not" (negativo) y el sujeto (pregunta): "Are they going to ...".
    if (auxIdx !== -1 && plan.expected.length > 1) {
      const subjectEnd = subjectIdx === -1 ? -1 : subjectIdx + subjectTokens.length
      const isSubjectToken = (i: number) => subjectIdx !== -1 && i >= subjectIdx && i < subjectEnd
      const tail = tokens.filter((token, i) => {
        if (i <= auxIdx) return false
        if (isNegative && token === 'not') return false
        if (isSubjectToken(i)) return false
        return true
      })
      const missingAt = plan.expected
        .slice(1)
        .findIndex((word, k) => tail[k] !== word)
      if (missingAt !== -1) {
        const i = missingAt + 1
        push(
          error(
            'aux_sequence',
            `Después de «${plan.expected.slice(0, i).join(' ')}» debe ir «${plan.expected[i]}» (${ti.formula}).`,
          ),
        )
      }
    }
  }

  /* --------------------------------------------- 4. Colocación de «not» */

  if (isNegative && notIdx !== -1 && auxIdx !== -1) {
    // "does not buy" / "are not going to buy": el "not" va justo tras la
    // palabra auxiliar principal, antes del resto de la locución.
    if (notIdx !== auxIdx + 1) {
      push(warn('not_placement', 'El «not» va inmediatamente después del auxiliar.'))
    }
  }

  /* -------------------------------------------------------- 5. Forma verbal */

  const expectedForm = planVerbForm(ti, si, polarity)
  const accepted = new Set<string>([forms[expectedForm]])
  // El participio de un verbo regular coincide con el pasado: no penalizar.
  if (expectedForm === 'participle') accepted.add(forms.past)

  const verbIdx = indexOfAny(tokens, accepted)
  const formKeys = Object.keys(forms) as FormKey[]

  if (verbIdx === -1) {
    // ¿Se ha escrito el verbo en una forma flexionada que no toca aquí?
    const wrongKey = formKeys.find((key) => !accepted.has(forms[key]) && tokens.includes(forms[key]))

    if (wrongKey) {
      push(error('verb_form', verbFormMessage(wrongKey, forms[wrongKey], ti, si, expectedForm, forms)))
    } else {
      push(error('verb_missing', `Falta el verbo «${forms[expectedForm]}» (${ti.formula}).`))
    }
  } else if (subjectIdx !== -1 && verbIdx < subjectIdx + subjectTokens.length) {
    push(error('verb_order', 'El verbo va después del sujeto.'))
  } else if (isNegative && notIdx !== -1 && verbIdx < notIdx) {
    push(error('verb_after_not', 'El «not» va antes del verbo: «does not buy», no «does buy not».'))
  }

  /* ----------------------------------------------------------- 6. Marcadores de tiempo equivocado */

  const rules = TENSE_MARKER_RULES[moment.tense] ?? []
  for (const rule of rules) {
    // No penalizar si la palabra forma parte de la estructura esperada.
    const hit = rule.words.find((word) => tokens.includes(word) && !plan.expected.includes(word))
    if (hit) push(error('tense_marker', rule.message))
  }

  /* ------------------------------------------------------------------ 7. Objeto */

  const objectText = verb.object.trim()
  if (objectText.length > 0 && findPhrase(tokens, objectText) === -1) {
    push(error('object_missing', `Falta el objeto «${objectText}»: la oración debe incluirlo tal cual.`))
  }

  /* -------------------------------------------------- 8. Conector de tiempo obligatorio */

  const constraint = moment.requiredTimeConstraint?.trim() ?? ''
  if (constraint.length > 0 && findPhrase(tokens, constraint) === -1) {
    let message = `Recuerda usar «${constraint}» para este tiempo verbal.`
    const requiredWord = tokenize(constraint)[0]
    if (requiredWord === 'in' && tokens.includes('since')) {
      message += ' Usa «in» para un momento concreto del pasado; «since» marca un periodo que sigue vigente.'
    } else if (requiredWord === 'since' && tokens.includes('in')) {
      message += ' Usa «since» cuando el periodo sigue vigente hasta hoy; «in» marca un momento cerrado.'
    } else if (tokens.includes('already') || tokens.includes('yet')) {
      message += ' Ese conector es propio del presente perfecto sin fecha concreta.'
    }
    push(error('time_constraint', message))
  }

  /* ----------------------------------------------------- 9. Marcadores obligatorios */

  const requiredAny = (moment.requiredAnyOf ?? []).filter((marker) => marker.trim().length > 0)
  if (requiredAny.length > 0 && !containsAnyPhrase(tokens, requiredAny)) {
    push(
      error(
        'marker_missing',
        `Esta combinación necesita un marcador de experiencia: ${listOf(requiredAny.map((m) => `«${m}»`))}.`,
      ),
    )
  }

  /* --------------------------------------------------------- 10. Sugerencias */

  const suggestAny = (moment.suggestAnyOf ?? []).filter((marker) => marker.trim().length > 0)
  if (suggestAny.length > 0 && !containsAnyPhrase(tokens, suggestAny)) {
    push(
      warn(
        'marker_suggested',
        `La frase es correcta, pero un marcador como ${listOf(suggestAny.slice(0, 3).map((m) => `«${m}»`))} le daría más sentido.`,
      ),
    )
  }

  /* ------------------------------------------- 11. Ortografía / puntuación */

  if (!/^["'(]?[A-Z]/.test(clean)) {
    push(warn('capitalization', 'Empieza la oración en mayúscula.'))
  }
  if (!/[.!?]["')\]]?$/.test(clean)) {
    push(warn('punctuation', isQuestion ? 'Una pregunta termina con interrogación: «?».' : 'Termina la oración con un punto.'))
  } else if (isQuestion && !/\?/.test(clean)) {
    push(warn('punctuation', 'Una pregunta termina con interrogación: «?».'))
  }

  const errors = issues.filter((i) => i.kind === 'error')
  const warnings = issues.filter((i) => i.kind === 'warning')

  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
    example: buildExample(combo),
  }
}

/* -------------------------------------------------------------------------- */
/*                          Mensajes de diagnóstico                           */
/* -------------------------------------------------------------------------- */

/** Primera palabra del auxiliar esperado (para mensajes de orden). */
function expectedAuxWord(ti: TenseInfo, si: SubjectInfo): string {
  return planAux(ti, si, 'affirmative').expected[0] ?? ''
}

function cap(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} o ${items[items.length - 1]}`
}

const BE_FORMS = new Set(['am', 'is', 'are', 'was', 'were'])

/** Mensaje de concordancia: "They is" → "con «They» se usa «are»". */
function agreementMessage(used: string, want: string, si: SubjectInfo, subject: string): string {
  if (BE_FORMS.has(used) && BE_FORMS.has(want)) {
    return `Con el sujeto «${subject}» se usa «${want}», no «${used}».`
  }
  if ((used === 'have' || used === 'has' || used === 'had') && (want === 'do' || want === 'does' || want === 'did')) {
    return `«${used}» forma el tiempo perfecto; aquí el auxiliar es «${want}» (${cap(want)} ${subject.toLowerCase()} ...).`
  }
  if ((used === 'do' || used === 'does' || used === 'did') && (want === 'have' || want === 'has' || want === 'had')) {
    return `«${used}» no forma el tiempo perfecto; aquí el auxiliar es «${want}» (${cap(want)} ${subject.toLowerCase()} ...).`
  }
  void si
  return `El auxiliar debe ser «${want}», no «${used}».`
}

/** Explica por qué la forma verbal escrita no vale aquí. */
function verbFormMessage(
  wrongKey: FormKey,
  wrongWord: string,
  ti: TenseInfo,
  si: SubjectInfo,
  expectedForm: FormKey,
  forms: VerbForms,
): string {
  const expectedWord = forms[expectedForm]
  const wrongLabel = FORM_LABEL[wrongKey]

  // El auxiliar ya carga la marca: el verbo debe ir en la forma más "plana".
  if (ti.carrier === 'do-past') {
    return `«did» ya marca el pasado, así que el verbo va en infinitivo: «${expectedWord}», no «${wrongWord}» (${wrongLabel}).`
  }
  if (ti.carrier === 'do-present') {
    return `«${si.doForm}» ya marca la 3ª persona, así que el verbo va en infinitivo: «${expectedWord}», no «${wrongWord}» (${wrongLabel}).`
  }
  if (ti.carrier === 'will' || ti.carrier === 'going-to') {
    return `Después de «${ti.carrier === 'will' ? 'will' : 'going to'}» el verbo va en infinitivo: «${expectedWord}», no «${wrongWord}» (${wrongLabel}).`
  }
  if (expectedForm === 'ing') {
    return `En ${ti.name.toLowerCase()} el verbo va en gerundio: «${expectedWord}», no «${wrongWord}» (${wrongLabel}).`
  }
  if (expectedForm === 'participle') {
    return `En ${ti.name.toLowerCase()} el verbo va en participio: «${expectedWord}», no «${wrongWord}» (${wrongLabel}).`
  }
  if (expectedForm === 'third') {
    return `Con «${si.doForm === 'does' ? 'he / she / it' : si.isPlural ? 'you / we / they' : 'I'}» el verbo va en 3ª persona: «${expectedWord}», no «${wrongWord}» (${wrongLabel}).`
  }
  return `El verbo debería ser «${expectedWord}» (${FORM_LABEL[expectedForm]}), no «${wrongWord}» (${wrongLabel}).`
}

/* -------------------------------------------------------------------------- */
/*                     Construcción de la oración de ejemplo                   */
/* -------------------------------------------------------------------------- */

function negativeBe(be: string): string {
  if (be === 'am') return 'am not'
  if (be === 'is') return "isn't"
  return "aren't"
}

/**
 * Genera una oración correcta para la combinación dada. Se usa en el botón
 * "Ver ejemplo" y en las pruebas de consistencia del propio motor.
 */
export function buildExample(combo: Combo): string {
  const { subject, verb, sentenceType, moment } = combo
  const si = getSubjectInfo(subject)
  const forms = getVerbForms(verb)
  const ti = TENSE_INFO[moment.tense] ?? TENSE_INFO.present_simple
  const polarity = sentenceType.type
  const neg = polarity === 'negative'
  const q = polarity === 'interrogative'

  const S = subject.trim()
  const s = S.toLowerCase()
  const O = verb.object.trim()
  const presentAffirmative = si.doForm === 'does' ? forms.third : forms.base

  let core: string
  switch (ti.carrier) {
    case 'do-present':
      core = q
        ? `${cap(si.doForm)} ${s} ${forms.base} ${O}`
        : neg
          ? `${S} ${si.doForm === 'does' ? "doesn't" : "don't"} ${forms.base} ${O}`
          : `${S} ${presentAffirmative} ${O}`
      break
    case 'do-past':
      core = q
        ? `Did ${s} ${forms.base} ${O}`
        : neg
          ? `${S} didn't ${forms.base} ${O}`
          : `${S} ${forms.past} ${O}`
      break
    case 'be-present':
      core = q
        ? `${cap(si.be)} ${s} ${forms.ing} ${O}`
        : neg
          ? `${S} ${negativeBe(si.be)} ${forms.ing} ${O}`
          : `${S} ${si.be} ${forms.ing} ${O}`
      break
    case 'be-past':
      core = q
        ? `${cap(si.wasWere)} ${s} ${forms.ing} ${O}`
        : neg
          ? `${S} ${si.wasWere === 'was' ? "wasn't" : "weren't"} ${forms.ing} ${O}`
          : `${S} ${si.wasWere} ${forms.ing} ${O}`
      break
    case 'have-present':
      core = q
        ? `${cap(si.have)} ${s} ${forms.participle} ${O}`
        : neg
          ? `${S} ${si.have === 'have' ? "haven't" : "hasn't"} ${forms.participle} ${O}`
          : `${S} ${si.have} ${forms.participle} ${O}`
      break
    case 'have-past':
      core = q
        ? `Had ${s} ${forms.participle} ${O}`
        : neg
          ? `${S} hadn't ${forms.participle} ${O}`
          : `${S} had ${forms.participle} ${O}`
      break
    case 'will':
      core = q
        ? `Will ${s} ${forms.base} ${O}`
        : neg
          ? `${S} won't ${forms.base} ${O}`
          : `${S} will ${forms.base} ${O}`
      break
    case 'going-to':
      core = q
        ? `${cap(si.be)} ${s} going to ${forms.base} ${O}`
        : neg
          ? `${S} ${negativeBe(si.be)} going to ${forms.base} ${O}`
          : `${S} ${si.be} going to ${forms.base} ${O}`
      break
  }

  const tail: string[] = []
  const constraint = moment.requiredTimeConstraint?.trim() ?? ''
  if (constraint.length > 0) tail.push(constraint)
  const markers = (moment.requiredAnyOf ?? []).filter((m) => m.trim().length > 0)
  if (markers.length > 0) tail.push(markers[0].trim())
  else if (moment.exampleAdverb?.trim()) tail.push(moment.exampleAdverb.trim())

  const sentence = [core, ...tail].filter((part) => part.trim().length > 0).join(' ')
  return cap(sentence) + (q ? '?' : '.')
}