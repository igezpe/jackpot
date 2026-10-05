/**
 * Módulo de transformación exhaustiva a Reported Speech.
 *
 * Reglas aplicadas:
 * 1. Prefijo obligatorio: "Maria said that " (el `that` es obligatorio).
 * 2. Backshift de tiempos.
 * 3. Transformación de pronombres y posesivos.
 * 4. Conectores de tiempo: se mantienen tal como vienen en el Moment.
 * 5. El `that` es obligatorio; si se omite, error.
 */

// Mapeo: tiempo original → nuevo tiempo en Reported Speech
const TENSE_BACKSHIFT: Record<string, string> = {
  present_simple: 'past_simple',
  present_continuous: 'past_continuous',
  present_perfect: 'past_perfect',
  past_simple: 'past_perfect',
  past_continuous: 'past_continuous',
  future_will: 'would',
  future_going_to: 'was going to',
}

/* -------------------------------------------------------------- */
/*                      Funciones de utilidad                     */
/* -------------------------------------------------------------- */

/**
 * Dado el sujeto de la oración original, devuelve el pronombre
 * que debe usarse en Reported Speech.
 */
function transformPronoun(originalPronoun: string, subjectFromReel1: string): string {
  const lower = originalPronoun.toLowerCase()
  if (/^(he|she|they|it)$/.test(lower)) return originalPronoun
  const map: Record<string, string> = {
    i: subjectFromReel1 === 'I' ? 'he' : 'she',
    we: 'they',
    my: 'his',
    our: 'their',
  }
  return map[lower] || originalPronoun
}

/* -------------------------------------------------------------- */
/*                 Aplicar backshift al verbo                     */
/* -------------------------------------------------------------- */

function applyBackshift(
  originalTense: string,
  verbBase: string,
  verbPast: string,
  verbParticiple: string,
  polarity: 'affirmative' | 'negative'
) {
  const newTense = TENSE_BACKSHIFT[originalTense]
  if (!newTense) {
    return { auxiliary: '', verbForm: 'base', negativeAux: '' }
  }

  let auxiliary = ''
  let verbForm = 'base'
  let negativeAux = ''

  switch (newTense) {
    case 'past_simple':
      if (polarity === 'negative') {
        auxiliary = 'hadn\'t'
        verbForm = 'participle'
        negativeAux = 'hadn\'t'
      } else {
        auxiliary = ''
        verbForm = 'base'
        negativeAux = ''
      }
      break
    case 'past_continuous':
      if (polarity === 'negative') {
        auxiliary = 'hadn\'t'
        verbForm = 'participle'
        negativeAux = 'hadn\'t'
      }
      break
    case 'past_perfect':
      auxiliary = 'had'
      verbForm = 'participle'
      if (polarity === 'negative') {
        auxiliary = 'hadn\'t'
        negativeAux = 'hadn\'t'
      }
      break
    case 'would':
      auxiliary = 'would'
      verbForm = 'base'
      negativeAux = ''
      break
    case 'was going to':
      auxiliary = 'was'
      verbForm = 'base'
      negativeAux = ''
      break
    default:
      auxiliary = ''
      verbForm = 'base'
      negativeAux = ''
  }
  return { auxiliary, verbForm, negativeAux }
}

/* -------------------------------------------------------------- */
/*                 Generación de la oración Reported               */
/* -------------------------------------------------------------- */

export function generateReportedSpeech(
  originalCombo: {
    subject: string
    verb: {
      verb: string
      object: string
      past: string
      participle: string
    }
    sentenceType: {
      type: 'affirmative' | 'negative' | 'interrogative'
    }
    moment: {
      tense: string
      requiredTimeConstraint?: string | null
    }
  },
  subjectFromReel1: string
) {
  const { subject, verb, sentenceType, moment } = originalCombo
  const tense = moment.tense
  const object = verb.object.trim()
  const isNegative = sentenceType.type === 'negative'

  // 1. Aplicar backshift
  const { auxiliary, verbForm, negativeAux } = applyBackshift(
    tense,
    verb.verb,
    verb.past,
    verb.participle,
    sentenceType.type
  )

  // 2. Transformar pronombre
  const reportedPronoun = transformPronoun(subject, subjectFromReel1)

  // 3. Construir la parte verbal
  let verbPart = ''

  if (auxiliary === '' && verbForm === 'base') {
    verbPart = reportedPronoun + ' ' + verb.verb.toLowerCase() + ' ' + object
  } else if (auxiliary) {
    const neg = negativeAux ? negativeAux : (isNegative ? 'hadn\'t' : 'had')
    const participle = verb.participle || verb.past
    verbPart = reportedPronoun + ' ' + neg + ' ' + participle + ' ' + object
  } else if (auxiliary === 'would') {
    verbPart = reportedPronoun + ' ' + auxiliary + ' ' + verb.verb.toLowerCase() + ' ' + object
  } else if (auxiliary === 'was') {
    verbPart = reportedPronoun + ' ' + auxiliary + ' going to ' + verb.verb.toLowerCase() + ' ' + object
  } else {
    verbPart = reportedPronoun + ' ' + verb.verb.toLowerCase() + ' ' + object
  }

  // 4. Conector de tiempo
  let finalSentence = 'Maria said that ' + verbPart
  if (moment.requiredTimeConstraint) {
    finalSentence += ' in ' + moment.requiredTimeConstraint
  }

  return {
    valid: true,
    message: 'Transformación a Reported Speech generada correctamente.',
    reportedSentence: finalSentence,
  }
}

/* -------------------------------------------------------------- */
/*                 Validación de Reported Speech                   */
/* -------------------------------------------------------------- */

export function validateReportedSpeech(
  userInput: string,
  originalCombo: {
    subject: string
    verb: {
      verb: string
      object: string
      past: string
      participle: string
    }
    sentenceType: {
      type: 'affirmative' | 'negative' | 'interrogative'
    }
    moment: {
      tense: string
      requiredTimeConstraint?: string | null
    }
  }
) {
  const issues: Array<{ code: string; kind: 'error' | 'warning'; message: string }> = []
  const errors: Array<{ code: string; message: string }> = []
  const warnings: Array<{ code: string; message: string }> = []

  // 1. Verificar prefijo obligatorio
  const PREFIX = 'Maria said that '
  if (!userInput.startsWith(PREFIX)) {
    errors.push({ code: 'missing_prefix', message: 'La oración debe empezar exactamente por "Maria said that ."' })
    const gen = generateReportedSpeech(originalCombo, 'I')
    return { valid: false, issues, errors, warnings, example: gen.reportedSentence }
  }

  const rest = userInput.slice(PREFIX.length).trim()
  if (rest.length === 0) {
    errors.push({ code: 'empty_after_prefix', message: 'Después de "Maria said that " debe ir la oración transformada.' })
    const gen = generateReportedSpeech(originalCombo, 'I')
    return { valid: false, issues, errors, warnings, example: gen.reportedSentence }
  }

  // Tokenizar el resto
  const TOKEN_RE = /[a-z0-9]+(?:'[a-z0-9]+)?/gi
  const normalizeText = (input: string) =>
    input
      .replace(/[\u2018\u2019\u02BC\uFF07]/g, "'")
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const tokens = normalizeText(rest).toLowerCase().match(TOKEN_RE) ?? []

  // 2. Verificar backshift: debería haber "had" + participio para perfectos
  const originalTense = originalCombo.moment.tense
  const hasHad = tokens.indexOf('had') !== -1
  const hasHadnT = tokens.indexOf('hadn\'t') !== -1 || tokens.indexOf('had not') !== -1

  // 3. Verificar pronombre esperado
  const originalSubject = originalCombo.subject.toLowerCase()
  const pronounMap: Record<string, string[]> = {
    'i': ['he', 'she'],
    'we': ['they'],
    'you': ['you'],
    'he': ['he'],
    'she': ['she'],
    'they': ['they'],
  }
  const expectedPronouns = pronounMap[originalSubject] || []

  const firstToken = tokens[0]
  const isExpectedPronoun = expectedPronouns.some((p: string) => p.toLowerCase() === firstToken)

  if (!isExpectedPronoun && expectedPronouns.length > 0) {
    warnings.push({
      code: 'unexpected_pronoun',
      message: 'Con el sujeto "' + originalCombo.subject + '" en Reported Speech se espera un pronombre como "' + expectedPronouns.join(' o ') + '". Se encontró "' + firstToken + '".',
    })
  }

  // 4. Verificar conector de tiempo
  const constraint = originalCombo.moment.requiredTimeConstraint?.trim() ?? ''
  if (constraint.length > 0) {
    if (rest.toLowerCase().indexOf(constraint.toLowerCase()) === -1) {
      warnings.push({
        code: 'time_constraint_missing',
        message: 'No se detectó el conector obligatorio "' + constraint + '". Se recomienda incluirlo (p. ej. "in January 2026").',
      })
    }
  }

  // 5. Determinar validez
  const hasProperVerbStructure =
    (originalTense === 'present_perfect' || originalTense === 'past_simple') &&
    (hasHad || hasHadnT)

  const valid =
    errors.length === 0 &&
    (hasProperVerbStructure || originalTense !== 'present_perfect' && originalTense !== 'past_simple')

  // 6. Generar ejemplo (ahora con la firma correcta)
  const generated = generateReportedSpeech(originalCombo, 'I')
  
  return {
    valid,
    issues,
    errors,
    warnings,
    example: generated.reportedSentence,
  }
}
