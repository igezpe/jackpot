/**
 * Comprobación de consistencia del motor de validación.
 *
 * Para las 4 x N x 3 x M combinaciones posibles se genera la oración modelo con
 * `buildExample` y se valida con `validate`. Si algunacombination no se acepta,
 * el botón "Ver ejemplo" estaría mintiendo.
 *
 * Ejecutar con:  npm run check
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import type { Combo, ReelsData } from '../src/types.ts'
import { buildExample, validate } from '../src/lib/validator.ts'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(
  readFileSync(resolve(here, '../src/data/reelsData.json'), 'utf8'),
) as ReelsData

let combos = 0
let failures = 0
const warnings: string[] = []

for (const subject of data.subjects) {
  for (const verb of data.verbs) {
    for (const sentenceType of data.sentenceTypes) {
      for (const moment of data.moments) {
        const combo: Combo = { subject, verb, sentenceType, moment }
        const example = buildExample(combo)
        const result = validate(example, combo, data.subjects)
        combos += 1
        if (!result.valid) {
          failures += 1
          console.error(`\n✗ ${example}`)
          for (const issue of result.errors) console.error(`   → ${issue.message}`)
        }
        if (result.warnings.length > 0) {
          warnings.push(`${example} → ${result.warnings.map((w) => w.code).join(', ')}`)
        }
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*           Casos de error que el motor DEBE detectar                         */
/* -------------------------------------------------------------------------- */

const find = (subject: string, verbIndex: number, typeId: string, momentId: string): Combo => ({
  subject,
  verb: data.verbs[verbIndex],
  sentenceType: data.sentenceTypes.find((t) => t.id === typeId)!,
  moment: data.moments.find((m) => m.id === momentId)!,
})

interface MustFail {
  label: string
  answer: string
  combo: Combo
  expectCode: string
}

const mustFail: MustFail[] = [
  {
    label: 'Sujeto equivocado',
    answer: 'He bought a car in January 2026.',
    combo: find('I', 0, 'aff', 'past_specific'),
    expectCode: 'subject_wrong',
  },
  {
    label: 'Falta el sujeto',
    answer: 'Bought a car in January 2026.',
    combo: find('I', 0, 'aff', 'past_specific'),
    expectCode: 'subject_missing',
  },
  {
    label: 'No conjuga en 3ª persona',
    answer: 'He buy a car every day.',
    combo: find('He', 0, 'aff', 'habit'),
    expectCode: 'verb_form',
  },
  {
    label: 'Sobrecarga de -s en plural',
    answer: 'They buys a car every day.',
    combo: find('They', 0, 'aff', 'habit'),
    expectCode: 'verb_form',
  },
  {
    label: 'Pasado en vez de infinitivo tras "does"',
    answer: "He doesn't bought a car every day.",
    combo: find('He', 0, 'neg', 'habit'),
    expectCode: 'verb_form',
  },
  {
    label: 'Pasado en vez de infinitivo tras "did"',
    answer: "I didn't bought a car in January 2026.",
    combo: find('I', 0, 'neg', 'past_specific'),
    expectCode: 'verb_form',
  },
  {
    label: 'Falta el "not" en negativa',
    answer: 'He buys a car every day.',
    combo: find('He', 0, 'neg', 'habit'),
    expectCode: 'negation_missing',
  },
  {
    label: '"not" en afirmativo',
    answer: 'They have not visited their family already.',
    combo: find('They', 1, 'aff', 'past_time_not_important'),
    expectCode: 'negation_unexpected',
  },
  {
    label: 'Concordancia de "be" incorrecta',
    answer: 'They is buying a car right now.',
    combo: find('They', 0, 'aff', 'right_now'),
    expectCode: 'aux_wrong',
  },
  {
    label: 'Perfecto presente en pasado simple',
    answer: 'He has bought a car in January 2026.',
    combo: find('He', 0, 'aff', 'past_specific'),
    expectCode: 'tense_marker',
  },
  {
    label: '"will" por "going to"',
    answer: 'They will visit their family.',
    combo: find('They', 1, 'aff', 'scheduled_plan'),
    expectCode: 'tense_marker',
  },
  {
    label: 'Falta el conector "in January 2026"',
    answer: 'He bought a car.',
    combo: find('He', 0, 'aff', 'past_specific'),
    expectCode: 'time_constraint',
  },
  {
    label: 'Usa "since" donde hace falta "in"',
    answer: 'He bought a car since January 2026.',
    combo: find('He', 0, 'aff', 'past_specific'),
    expectCode: 'time_constraint',
  },
  {
    label: 'Falta "since January 2026"',
    answer: 'They have visited their family already.',
    combo: find('They', 1, 'aff', 'past_connected'),
    expectCode: 'time_constraint',
  },
  {
    label: 'Falta marcador de experiencia',
    answer: 'They have visited their family.',
    combo: find('They', 1, 'aff', 'past_time_not_important'),
    expectCode: 'marker_missing',
  },
  {
    label: 'Falta el objeto',
    answer: 'He finished in January 2026.',
    combo: find('He', 3, 'aff', 'past_specific'),
    expectCode: 'object_missing',
  },
  {
    label: 'Auxiliar "do" en afirmativo',
    answer: 'He does buy a car every day.',
    combo: find('He', 0, 'aff', 'habit'),
    expectCode: 'aux_unexpected',
  },
  {
    label: 'Falta el gerundio en presente continuo',
    answer: 'They are visit their family right now.',
    combo: find('They', 1, 'aff', 'right_now'),
    expectCode: 'verb_form',
  },
  {
    label: 'Falta el participio en pasado perfecto',
    answer: 'They had visit their family.',
    combo: find('They', 1, 'aff', 'prior_past_action'),
    expectCode: 'verb_form',
  },
  {
    label: 'Sujeto mal colocado en pregunta',
    answer: 'We finish the project every day?',
    combo: find('We', 3, 'int', 'habit'),
    expectCode: 'subject_order_question',
  },
  {
    label: 'Sujeto equivocado en pregunta',
    answer: 'You finish the project every day?',
    combo: find('We', 3, 'int', 'habit'),
    expectCode: 'subject_wrong',
  },
]

/* -------------------------------------------------------------------------- */
/*             Casos que el motor NO debe marcar como error                   */
/* -------------------------------------------------------------------------- */

const mustPass: { label: string; answer: string; combo: Combo }[] = [
  { label: 'Mayúscula opcional', answer: 'they visit their family every day.', combo: find('They', 1, 'aff', 'habit') },
  {
    label: 'Comas alrededor del objeto',
    answer: "He doesn't buy, a car, every day.",
    combo: find('He', 0, 'neg', 'habit'),
  },
  {
    label: 'Adverbio entre auxiliar y not',
    answer: "They haven't already visited their family.",
    combo: find('They', 1, 'neg', 'past_time_not_important'),
  },
  { label: 'Comilla tipográfica', answer: 'He bought a car in January 2026!', combo: find('He', 0, 'aff', 'past_specific') },
]

/* -------------------------------------------------------------------------- */

console.log(`\nEjemplos generados: ${combos}`)
if (warnings.length > 0) {
  console.log(`Avisos inesperados en ejemplos: ${warnings.length}`)
  for (const w of warnings.slice(0, 12)) console.log(`  · ${w}`)
}
if (failures > 0) {
  console.error(`\n${failures} de ${combos} ejemplos NO validan.\n`)
  process.exit(1)
}
console.log(`✔ Los ${combos} ejemplos se validan correctamente.`)

let detected = 0
const missErrors: string[] = []
for (const test of mustFail) {
  const result = validate(test.answer, test.combo, data.subjects)
  const hit = result.errors.some((e) => e.code === test.expectCode)
  if (hit) detected += 1
  else {
    missErrors.push(
      `${test.label}: esperaba «${test.expectCode}» y obtuvo [${result.errors.map((e) => e.code).join(', ') || 'sin errores'}]`,
    )
  }
}

const falsePositives: string[] = []
for (const test of mustPass) {
  const result = validate(test.answer, test.combo, data.subjects)
  if (!result.valid) {
    falsePositives.push(`${test.label}: ${result.errors.map((e) => e.message).join(' | ')}`)
  }
}

console.log(`\nCasos de error detectados: ${detected}/${mustFail.length}`)
console.log(`Casos válidos aceptados: ${mustPass.length - falsePositives.length}/${mustPass.length}`)

if (missErrors.length > 0 || falsePositives.length > 0) {
  console.error('\nDetalle:')
  for (const m of missErrors) console.error(`  ✗ no detectado → ${m}`)
  for (const f of falsePositives) console.error(`  ✗ falso positivo → ${f}`)
  process.exit(1)
}

console.log('\n✔ Todas las comprobaciones pasan.\n')