import { useState } from 'react'
import type { Moment, Polarity, ReelsData, Tense, Verb } from '../../types'
import { TENSE_LIST } from '../../lib/grammar'
import { EditableRow, EditorSection, Field } from './fields'
import { listToText, textToList } from './listHelpers'

export type ReelSection = 'subjects' | 'verbs' | 'sentenceTypes' | 'moments'

interface ReelsEditorProps {
  data: ReelsData
  onChange: (updater: (current: ReelsData) => ReelsData) => void
  section: ReelSection
}

const POLARITIES: { value: Polarity; label: string }[] = [
  { value: 'affirmative', label: 'Afirmativa [+]' },
  { value: 'negative', label: 'Negativa [-]' },
  { value: 'interrogative', label: 'Interrogativa [?]' },
]

/** Id numérico siguiente para los elementos nuevos. */
function nextId(existing: { id: string }[]): string {
  const numeric = existing
    .map((item) => Number.parseInt(item.id, 10))
    .filter((n) => Number.isFinite(n))
  const max = numeric.length > 0 ? Math.max(...numeric) : 0
  return String(max + 1)
}

/* -------------------------------------------------------------------------- */

export function ReelsEditor({ data, onChange, section }: ReelsEditorProps) {
  if (section === 'subjects') return <SubjectsEditor data={data} onChange={onChange} />
  if (section === 'verbs') return <VerbsEditor data={data} onChange={onChange} />
  if (section === 'sentenceTypes') return <TypesEditor data={data} onChange={onChange} />
  return <MomentsEditor data={data} onChange={onChange} />
}

/* -------------------------------------------------------------------------- */
/*                               Reel 1: Sujetos                              */
/* -------------------------------------------------------------------------- */

function SubjectsEditor({
  data,
  onChange,
}: Pick<ReelsEditorProps, 'data' | 'onChange'>) {
  const update = (index: number, value: string) =>
    onChange((d) => ({ ...d, subjects: d.subjects.map((s, i) => (i === index ? value : s)) }))

  const remove = (index: number) =>
    onChange((d) => ({ ...d, subjects: d.subjects.filter((_, i) => i !== index) }))

  const add = () => onChange((d) => ({ ...d, subjects: [...d.subjects, ''] }))

  const duplicates = data.subjects.filter(
    (subject, i) => data.subjects.findIndex((other) => other.toLowerCase() === subject.toLowerCase()) !== i,
  )

  return (
    <EditorSection
      title="Rodillo 1 · Sujetos"
      description="Pronombres o sintagmas nominales. El motor deduce la concordancia (I → am/have/do, He → is/has/does, They → are/have/do)."
      count={data.subjects.length}
      onAdd={add}
      addLabel="+ Sujeto"
    >
      {data.subjects.map((subject, index) => (
        <EditableRow key={index} onRemove={() => remove(index)} disabled={data.subjects.length <= 1}>
          <Field label={`Sujeto ${index + 1}`}>
            <input
              className="field font-medium"
              value={subject}
              placeholder="I, You, He, She, We, They…"
              onChange={(event) => update(index, event.target.value)}
            />
          </Field>
        </EditableRow>
      ))}

      {data.subjects.some((s) => s.trim() === '') && (
        <p className="text-xs text-candy-300">
          Hay sujetos vacíos: no se usarán al tirar, pero conviene rellenarlos o borrarlos.
        </p>
      )}
      {duplicates.length > 0 && (
        <p className="text-xs text-gold-300">
          Sujetos duplicados: {duplicates.join(', ')}. El validador usa el primero que encuentra.
        </p>
      )}
    </EditorSection>
  )
}

/* -------------------------------------------------------------------------- */
/*                            Reel 2: Verbo + Objeto                          */
/* -------------------------------------------------------------------------- */

function VerbsEditor({ data, onChange }: Pick<ReelsEditorProps, 'data' | 'onChange'>) {
  const update = (index: number, patch: Partial<Verb>) =>
    onChange((d) => ({
      ...d,
      verbs: d.verbs.map((verb, i) => (i === index ? { ...verb, ...patch } : verb)),
    }))

  const remove = (index: number) =>
    onChange((d) => ({ ...d, verbs: d.verbs.filter((_, i) => i !== index) }))

  const add = () =>
    onChange((d) => ({
      ...d,
      verbs: [
        ...d.verbs,
        { id: nextId(d.verbs), verb: '', object: '', past: '', participle: '', ing: '', third: '' },
      ],
    }))

  return (
    <EditorSection
      title="Rodillo 2 · Verbo + Objeto"
      description="El objeto debe aparecer literal en tu respuesta. «past» y «participle» son obligatorios; «ing» y «third» se derivan automáticamente si los dejas vacíos."
      count={data.verbs.length}
      onAdd={add}
      addLabel="+ Verbo"
    >
      {data.verbs.map((verb, index) => (
        <EditableRow key={verb.id || index} onRemove={() => remove(index)} disabled={data.verbs.length <= 1}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Field label="Base" className="col-span-1">
              <input
                className="field"
                value={verb.verb}
                placeholder="Buy"
                onChange={(e) => update(index, { verb: e.target.value })}
              />
            </Field>
            <Field label="Objeto" className="col-span-1">
              <input
                className="field"
                value={verb.object}
                placeholder="a car"
                onChange={(e) => update(index, { object: e.target.value })}
              />
            </Field>
            <Field label="Past" className="col-span-1">
              <input
                className="field"
                value={verb.past}
                placeholder="bought"
                onChange={(e) => update(index, { past: e.target.value })}
              />
            </Field>
            <Field label="Participio" className="col-span-1">
              <input
                className="field"
                value={verb.participle}
                placeholder="bought"
                onChange={(e) => update(index, { participle: e.target.value })}
              />
            </Field>
            <Field label="-ing" hint="opcional" className="col-span-1">
              <input
                className="field"
                value={verb.ing ?? ''}
                placeholder="buying"
                onChange={(e) => update(index, { ing: e.target.value })}
              />
            </Field>
            <Field label="3ª pers." hint="opcional" className="col-span-1">
              <input
                className="field"
                value={verb.third ?? ''}
                placeholder="buys"
                onChange={(e) => update(index, { third: e.target.value })}
              />
            </Field>
          </div>
        </EditableRow>
      ))}
    </EditorSection>
  )
}

/* -------------------------------------------------------------------------- */
/*                         Reel 3: Tipo de oración                             */
/* -------------------------------------------------------------------------- */

function TypesEditor({ data, onChange }: Pick<ReelsEditorProps, 'data' | 'onChange'>) {
  const update = (index: number, patch: Partial<{ label: string; type: Polarity }>) =>
    onChange((d) => ({
      ...d,
      sentenceTypes: d.sentenceTypes.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }))

  const remove = (index: number) =>
    onChange((d) => ({ ...d, sentenceTypes: d.sentenceTypes.filter((_, i) => i !== index) }))

  const add = () =>
    onChange((d) => ({
      ...d,
      sentenceTypes: [...d.sentenceTypes, { id: nextId(d.sentenceTypes), label: '[ + ] Affirmative', type: 'affirmative' }],
    }))

  return (
    <EditorSection
      title="Rodillo 3 · Tipo de oración"
      description="La polaridad decide si hace falta «not», si el verbo va en infinitivo o conjugado y si el auxiliar abre la frase."
      count={data.sentenceTypes.length}
      onAdd={add}
      addLabel="+ Tipo"
    >
      {data.sentenceTypes.map((type, index) => (
        <EditableRow key={type.id || index} onRemove={() => remove(index)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Etiqueta">
              <input
                className="field"
                value={type.label}
                placeholder="[ - ] Negative"
                onChange={(e) => update(index, { label: e.target.value })}
              />
            </Field>
            <Field label="Tipo" className="sm:col-span-2">
              <select
                className="field"
                value={type.type}
                onChange={(e) => update(index, { type: e.target.value as Polarity })}
              >
                {POLARITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </EditableRow>
      ))}
    </EditorSection>
  )
}

/* -------------------------------------------------------------------------- */
/*                          Reel 4: Momento / intención                         */
/* -------------------------------------------------------------------------- */

function MomentsEditor({ data, onChange }: Pick<ReelsEditorProps, 'data' | 'onChange'>) {
  const [openId, setOpenId] = useState<string | null>(data.moments[0]?.id ?? null)

  const update = (index: number, patch: Partial<Moment>) =>
    onChange((d) => ({
      ...d,
      moments: d.moments.map((moment, i) => (i === index ? { ...moment, ...patch } : moment)),
    }))

  const remove = (index: number) =>
    onChange((d) => ({ ...d, moments: d.moments.filter((_, i) => i !== index) }))

  const add = () =>
    onChange((d) => ({
      ...d,
      moments: [
        ...d.moments,
        {
          id: `m${nextId(d.moments)}`,
          label: 'New moment',
          tense: 'present_simple',
          requiredTimeConstraint: null,
        },
      ],
    }))

  const info = (tense: Tense) => TENSE_LIST.find((t) => t.key === tense)

  return (
    <EditorSection
      title="Rodillo 4 · Momento / Intención"
      description="Cada momento fija el tiempo verbal y, si quieres, un conector obligatorio («in January 2026») o marcadores («already», «yet»…)."
      count={data.moments.length}
      onAdd={add}
      addLabel="+ Momento"
    >
      {data.moments.map((moment, index) => {
        const open = openId === moment.id
        const tenseInfo = info(moment.tense)
        return (
          <EditableRow
            key={moment.id || index}
            onRemove={() => remove(index)}
            disabled={data.moments.length <= 1}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : moment.id)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="font-display block truncate text-sm font-semibold text-gold-200">
                  {moment.label || '(sin etiqueta)'}
                </span>
                <span className="mt-0.5 block text-[0.65rem] text-slate-500">
                  {tenseInfo?.name ?? moment.tense}
                  {moment.requiredTimeConstraint ? ` · exige «${moment.requiredTimeConstraint}»` : ''}
                  {moment.requiredAnyOf?.length ? ` · marcadores: ${listToText(moment.requiredAnyOf)}` : ''}
                </span>
              </span>
              <span className={`shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {open && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Etiqueta">
                  <input
                    className="field"
                    value={moment.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                  />
                </Field>
                <Field label="Tiempo verbal" hint={tenseInfo?.formula}>
                  <select
                    className="field"
                    value={moment.tense}
                    onChange={(e) => update(index, { tense: e.target.value as Tense })}
                  >
                    {TENSE_LIST.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Conector obligatorio" hint="Vacío = no se exige ninguno">
                  <input
                    className="field"
                    value={moment.requiredTimeConstraint ?? ''}
                    placeholder="in January 2026"
                    onChange={(e) =>
                      update(index, { requiredTimeConstraint: e.target.value.trim() || null })
                    }
                  />
                </Field>
                <Field label="Marcadores obligatorios" hint="Al menos uno · separados por comas">
                  <input
                    className="field"
                    value={listToText(moment.requiredAnyOf)}
                    placeholder="already, yet, ever, never"
                    onChange={(e) => update(index, { requiredAnyOf: textToList(e.target.value) })}
                  />
                </Field>
                <Field label="Marcadores sugeridos" hint="Generan un aviso, no un error">
                  <input
                    className="field"
                    value={listToText(moment.suggestAnyOf)}
                    placeholder="every day, usually"
                    onChange={(e) => update(index, { suggestAnyOf: textToList(e.target.value) })}
                  />
                </Field>
                <Field label="Adverbio del ejemplo" hint="Se usa en «Ver ejemplo»">
                  <input
                    className="field"
                    value={moment.exampleAdverb ?? ''}
                    placeholder="every day"
                    onChange={(e) => update(index, { exampleAdverb: e.target.value })}
                  />
                </Field>
                <Field label="Explicación (español)" className="sm:col-span-2">
                  <textarea
                    className="field min-h-16 resize-y"
                    rows={2}
                    value={moment.hint ?? ''}
                    onChange={(e) => update(index, { hint: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </EditableRow>
        )
      })}
    </EditorSection>
  )
}