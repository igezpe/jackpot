import rawData from '../data/conditionalsData.json'

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

export type ConditionalType = 'zero' | 'first' | 'second' | 'third'

export interface VerbForms {
  base: string
  third: string
  past: string
  participle: string
}

export interface ConditionalUsage {
  id: string
  label: string
  conditionalType: ConditionalType
  description: string
}

export interface ConditionalSubject {
  id: string
  label: string
  allowedConditions: string[]
}

export interface ConditionalCondition {
  id: string
  conditionalType: ConditionalType
  verb: VerbForms
  complement: string
  allowedSubjects: string[]
  compatibleResults: string[]
}

export interface ConditionalResult {
  id: string
  conditionalType: ConditionalType
  verb: VerbForms
  complement: string
  resultSubject?: string
}

export interface ConditionalPolarity {
  id: string
  label: string
}

export interface ConditionalData {
  usages: ConditionalUsage[]
  subjects: ConditionalSubject[]
  conditions: ConditionalCondition[]
  results: ConditionalResult[]
  polarities: ConditionalPolarity[]
}

/** Combinación ganadora de los 5 rodillos. */
export interface ConditionalRoll {
  usage: ConditionalUsage
  subject: ConditionalSubject
  condition: ConditionalCondition
  result: ConditionalResult
  polarity: ConditionalPolarity
}

export interface ConditionalValidationResult {
  isValid: boolean
  feedback: string
  /** Tipo esperado, útil para mostrar la fórmula. */
  conditionalType: ConditionalType
}

export const CONDITIONAL_DATA = rawData as unknown as ConditionalData

/* -------------------------------------------------------------------------- */
/*                               Utilidades                                   */
/* -------------------------------------------------------------------------- */

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]!

const isThirdPerson = (label: string): boolean => {
  const l = label.trim().toLowerCase()
  return l === 'he' || l === 'she' || l === 'it'
}

/** Une el complemento evitando dobles espacios. */
const join = (verbPart: string, complement: string): string =>
  complement.length > 0 ? `${verbPart} ${complement}` : verbPart

/* -------------------------------------------------------------------------- */
/*                           Giro encadenado (spin)                           */
/* -------------------------------------------------------------------------- */

/**
 * Gira los 5 rodillos con dependencias semánticas encadenadas:
 *  R1 Usage      -> define el tipo de condicional
 *  R2 Subject    -> sujeto de la cláusula If
 *  R3 Condition  -> filtrada por allowedSubjects del sujeto
 *  R4 Result     -> filtrado por compatibleResults de la condición
 *  R5 Polarity   -> mantiene la coherencia [+/+] o [-/-]
 */
export function rollConditional(data: ConditionalData = CONDITIONAL_DATA): ConditionalRoll {
  // R1: uso (define el tipo condicional esperado)
  const usage = pick(data.usages)

  // R2: sujeto
  const subject = pick(data.subjects)

  // R3: condiciones permitidas para el sujeto, priorizando el tipo del uso
  const allowed = data.conditions.filter((c) => {
    const byCondition = c.allowedSubjects.length === 0 || c.allowedSubjects.includes(subject.id)
    const bySubject = subject.allowedConditions.length === 0 || subject.allowedConditions.includes(c.id)
    return byCondition && bySubject
  })
  const pool = allowed.length > 0 ? allowed : data.conditions
  const typed = pool.filter((c) => c.conditionalType === usage.conditionalType)
  const condition = pick(typed.length > 0 ? typed : pool)

  // R4: resultados compatibles con la condición elegida
  const results = data.results.filter((r) => condition.compatibleResults.includes(r.id))
  const result = pick(results.length > 0 ? results : data.results)

  // R5: polaridad
  const polarity = pick(data.polarities)

  // Si el uso elegido no coincide con el tipo real de la condición, ajustamos
  // el uso mostrado para que el enunciado siga siendo coherente.
  const effectiveUsage =
    usage.conditionalType === condition.conditionalType
      ? usage
      : (data.usages.find((u) => u.conditionalType === condition.conditionalType) ?? usage)

  return { usage: effectiveUsage, subject, condition, result, polarity }
}

/* -------------------------------------------------------------------------- */
/*                        Construcción de la oración                          */
/* -------------------------------------------------------------------------- */

function buildIfClause(
  type: ConditionalType,
  subject: string,
  verb: VerbForms,
  complement: string,
  negative: boolean,
): string {
  switch (type) {
    case 'second':
      return negative
        ? join(`didn't ${verb.base}`, complement)
        : join(verb.past, complement)
    case 'third':
      return negative
        ? join(`hadn't ${verb.participle}`, complement)
        : join(`had ${verb.participle}`, complement)
    case 'zero':
    case 'first':
    default:
      return negative
        ? join(`${isThirdPerson(subject) ? "doesn't" : "don't"} ${verb.base}`, complement)
        : join(isThirdPerson(subject) ? verb.third : verb.base, complement)
  }
}

function buildResultClause(
  type: ConditionalType,
  subject: string,
  verb: VerbForms,
  complement: string,
  negative: boolean,
): string {
  switch (type) {
    case 'first':
      return join(`${negative ? "won't" : 'will'} ${verb.base}`, complement)
    case 'second':
      return join(`${negative ? "wouldn't" : 'would'} ${verb.base}`, complement)
    case 'third':
      return join(`${negative ? "wouldn't have" : 'would have'} ${verb.participle}`, complement)
    case 'zero':
    default:
      return negative
        ? join(`${isThirdPerson(subject) ? "doesn't" : "don't"} ${verb.base}`, complement)
        : join(isThirdPerson(subject) ? verb.third : verb.base, complement)
  }
}

/** Oración modelo completa para una combinación. */
export function buildConditionalSentence(roll: ConditionalRoll): string {
  const negative = roll.polarity.id === 'neg'
  const ifClause = buildIfClause(
    roll.condition.conditionalType,
    roll.subject.label,
    roll.condition.verb,
    roll.condition.complement,
    negative,
  )
  const resultSubject = roll.result.resultSubject ?? roll.subject.label
  const resultClause = buildResultClause(
    roll.result.conditionalType,
    resultSubject,
    roll.result.verb,
    roll.result.complement,
    negative,
  )
  return `If ${ifClause}, ${resultClause}.`
}

/* -------------------------------------------------------------------------- */
/*                            Validación exhaustiva                           */
/* -------------------------------------------------------------------------- */

const has = (text: string, ...needles: string[]): boolean =>
  needles.some((n) => text.includes(n))

const hasWord = (text: string, ...words: string[]): boolean =>
  words.some((w) => new RegExp(`\\b${w}\\b`).test(text))

/**
 * Detecta errores de concordancia sujeto-verbo en Present Simple.
 * Devuelve un mensaje si hay error, o null si no se puede juzgar / es correcto.
 */
function agreementProblem(clause: string, subjectLabel: string, verb: VerbForms): string | null {
  const third = isThirdPerson(subjectLabel)
  const hasThird = hasWord(clause, verb.third)
  const hasBase = hasWord(clause, verb.base)
  const negThird = has(clause, "doesn't", 'does not')
  const negNonThird = has(clause, "don't", 'do not')

  if (third) {
    if (negThird) return null
    if (hasBase && !hasThird) {
      return `Concordancia: con "${subjectLabel}" el verbo va en 3ª persona del singular: "${verb.third}", no "${verb.base}".`
    }
    return null
  }
  if (negNonThird) return null
  if (hasThird && !hasBase) {
    return `Concordancia: con "${subjectLabel}" el verbo NO lleva -s: "${verb.base}", no "${verb.third}".`
  }
  return null
}

/**
 * Comprueba que aparezca la forma verbal requerida (base/past/participle).
 * Sólo se queja si falta la forma requerida Y aparece otra forma del mismo verbo.
 */
function wrongForm(clause: string, verb: VerbForms, required: keyof VerbForms): string | null {
  const wanted = verb[required]
  if (!wanted) return null
  if (hasWord(clause, wanted)) return null
  const keys: (keyof VerbForms)[] = ['base', 'third', 'past', 'participle']
  const other = keys
    .filter((k) => k !== required)
    .map((k) => verb[k])
    .find((form) => form.length > 0 && form !== wanted && hasWord(clause, form))
  if (other) {
    const label =
      required === 'participle' ? 'participio' : required === 'past' ? 'pasado' : 'forma base'
    return `Usa "${wanted}" (${label}), no "${other}".`
  }
  return null
}

/**
 * Evalúa la respuesta del usuario contra las 4 estructuras condicionales.
 * Tolerante a que el usuario escriba o no la palabra "If".
 */
export function validateConditionalAnswer(
  userAnswer: string,
  currentRoll: ConditionalRoll,
): ConditionalValidationResult {
  const type = currentRoll.condition.conditionalType
  const raw = userAnswer.trim()

  if (raw.length === 0) {
    return { isValid: false, feedback: 'Escribe una oración antes de validar.', conditionalType: type }
  }

  const text = raw
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\uFF07]/g, "'")
    .replace(/\s+/g, ' ')

  // La oración siempre parte de "If": se tolera que el usuario no lo escriba.
  if (!hasWord(text, 'if')) {
    return {
      isValid: false,
      feedback: 'La oración debe empezar con "If" (por ejemplo: "If ... ").',
      conditionalType: type,
    }
  }

  const commaIndex = text.indexOf(',')
  const ifClause = commaIndex >= 0 ? text.slice(0, commaIndex) : text
  const resultClause = commaIndex >= 0 ? text.slice(commaIndex + 1) : ''

  if (resultClause.trim().length === 0) {
    return {
      isValid: false,
      feedback: 'Falta la cláusula del resultado. Sepárala con una coma: "If ..., ...".',
      conditionalType: type,
    }
  }

  const ifHasWill = hasWord(ifClause, 'will', "won't") || has(ifClause, 'will not')
  const ifHasWould = hasWord(ifClause, 'would', "wouldn't") || has(ifClause, 'would not')
  const ifHasHad = hasWord(ifClause, 'had', "hadn't") || has(ifClause, 'had not')
  const resultHasWill = hasWord(resultClause, 'will', "won't") || has(resultClause, 'will not')
  const resultHasWouldHave =
    has(resultClause, 'would have') ||
    has(resultClause, "wouldn't have") ||
    has(resultClause, 'would not have')
  const resultHasWould =
    hasWord(resultClause, 'would', "wouldn't") || has(resultClause, 'would not')

  const isNegativeClause = (clause: string): boolean =>
    has(clause, "don't") ||
    has(clause, "doesn't") ||
    has(clause, "didn't") ||
    has(clause, "hadn't") ||
    has(clause, "won't") ||
    has(clause, "wouldn't") ||
    hasWord(clause, 'not')

  const ifNegative = isNegativeClause(ifClause)
  const resultNegative = isNegativeClause(resultClause)

  // Coherencia de polaridad: las DOS cláusulas en [+/+] o las DOS en [-/-].
  if (currentRoll.polarity.id === 'neg' && (!ifNegative || !resultNegative)) {
    return {
      isValid: false,
      feedback: 'La polaridad elegida es negativa: niega las DOS cláusulas (If y resultado).',
      conditionalType: type,
    }
  }
  if (currentRoll.polarity.id === 'pos' && (ifNegative || resultNegative)) {
    return {
      isValid: false,
      feedback: 'La polaridad elegida es positiva: usa formas afirmativas en ambas cláusulas.',
      conditionalType: type,
    }
  }

  switch (type) {
    case 'zero': {
      if (ifHasWill || ifHasWould || ifHasHad || resultHasWill || resultHasWould) {
        return {
          isValid: false,
          feedback: 'Zero Conditional: If + Present Simple, Present Simple (sin will/would/had).',
          conditionalType: type,
        }
      }
      const ifAgree = agreementProblem(ifClause, currentRoll.subject.label, currentRoll.condition.verb)
      if (ifAgree) return { isValid: false, feedback: ifAgree, conditionalType: type }
      const resultSubjectLabel = currentRoll.result.resultSubject ?? currentRoll.subject.label
      const resAgree = agreementProblem(resultClause, resultSubjectLabel, currentRoll.result.verb)
      if (resAgree) return { isValid: false, feedback: resAgree, conditionalType: type }
      return { isValid: true, feedback: '¡Correcto! Zero Conditional: presente simple en ambas cláusulas.', conditionalType: type }
    }
    case 'first': {
      if (ifHasWill || ifHasWould) {
        return { isValid: false, feedback: 'La cláusula If del First Conditional va en Present Simple, no con will/would.', conditionalType: type }
      }
      if (!resultHasWill) {
        return { isValid: false, feedback: 'First Conditional: If + Present Simple, WILL / WON\'T + verbo base.', conditionalType: type }
      }
      const ifAgree = agreementProblem(ifClause, currentRoll.subject.label, currentRoll.condition.verb)
      if (ifAgree) return { isValid: false, feedback: ifAgree, conditionalType: type }
      const resForm = wrongForm(resultClause, currentRoll.result.verb, 'base')
      if (resForm) return { isValid: false, feedback: resForm, conditionalType: type }
      return { isValid: true, feedback: '¡Correcto! First Conditional: Present Simple + will/won\'t + verbo base.', conditionalType: type }
    }
    case 'second': {
      if (ifHasWill) {
        return { isValid: false, feedback: 'La cláusula If del Second Conditional va en Past Simple, no con will.', conditionalType: type }
      }
      if (resultHasWouldHave) {
        return { isValid: false, feedback: 'El Second Conditional usa WOULD (no "would have"). Eso es Third Conditional.', conditionalType: type }
      }
      if (!resultHasWould) {
        return { isValid: false, feedback: 'Second Conditional: If + Past Simple, WOULD / WOULDN\'T + verbo base.', conditionalType: type }
      }
      const secondIfNegative = has(ifClause, "didn't", 'did not')
      if (!secondIfNegative) {
        const ifForm = wrongForm(ifClause, currentRoll.condition.verb, 'past')
        if (ifForm) return { isValid: false, feedback: ifForm, conditionalType: type }
      }
      const resForm2 = wrongForm(resultClause, currentRoll.result.verb, 'base')
      if (resForm2) return { isValid: false, feedback: resForm2, conditionalType: type }
      return { isValid: true, feedback: '¡Correcto! Second Conditional: Past Simple + would/wouldn\'t + verbo base.', conditionalType: type }
    }
    case 'third': {
      if (!ifHasHad) {
        return { isValid: false, feedback: 'Third Conditional: la cláusula If usa Past Perfect (HAD / HADN\'T + participio).', conditionalType: type }
      }
      if (!resultHasWouldHave) {
        return { isValid: false, feedback: 'Third Conditional: el resultado usa WOULD HAVE / WOULDN\'T HAVE + participio.', conditionalType: type }
      }
      const ifForm3 = wrongForm(ifClause, currentRoll.condition.verb, 'participle')
      if (ifForm3) return { isValid: false, feedback: ifForm3, conditionalType: type }
      const resForm3 = wrongForm(resultClause, currentRoll.result.verb, 'participle')
      if (resForm3) return { isValid: false, feedback: resForm3, conditionalType: type }
      return { isValid: true, feedback: '¡Correcto! Third Conditional: Past Perfect + would have + participio.', conditionalType: type }
    }
  }
}

