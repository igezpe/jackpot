import type {
  ConditionalCondition,
  ConditionalData,
  ConditionalPolarity,
  ConditionalResult,
  ConditionalSubject,
  ConditionalType,
  ConditionalUsage,
  VerbForms,
} from '../../lib/conditionals'
import { EditableRow, EditorSection, Field } from './fields'

export type ConditionalsSection = 'usages' | 'subjects' | 'conditions' | 'results' | 'polarities'

interface EditorProps {
  data: ConditionalData
  onChange: (updater: (current: ConditionalData) => ConditionalData) => void
  section: ConditionalsSection
}

const TYPES: { value: ConditionalType; label: string }[] = [
  { value: 'zero', label: 'Zero (present + present)' },
  { value: 'first', label: 'First (present + will)' },
  { value: 'second', label: 'Second (past + would)' },
  { value: 'third', label: 'Third (past perfect + would have)' },
]

const VERB_FIELDS: { key: keyof VerbForms; label: string; placeholder: string }[] = [
  { key: 'base', label: 'Base', placeholder: 'study' },
  { key: 'third', label: '3ª pers.', placeholder: 'studies' },
  { key: 'past', label: 'Past', placeholder: 'studied' },
  { key: 'participle', label: 'Participio', placeholder: 'studied' },
]

function nextId(items: { id: string }[], prefix: string): string {
  const nums = items
    .map((item) => Number.parseInt(item.id.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `${prefix}${max + 1}`
}

/** Lista de checkboxes sobre ids (para allowedSubjects / compatibleResults). */
function IdChecklist({
  items,
  selected,
  onToggle,
  emptyHint,
}: {
  items: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
  emptyHint: string
}) {
  if (items.length === 0) return <p className="text-[0.65rem] text-slate-500">{emptyHint}</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected.includes(item.id)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`rounded-lg border px-2 py-1 text-xs transition ${
              active
                ? 'border-gold-400/60 bg-gold-400/15 text-gold-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/25'
            }`}
          >
            {item.label || '(sin nombre)'}
            <span className="ml-1 text-[0.6rem] text-slate-500">{item.id}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ConditionalsEditor({ data, onChange, section }: EditorProps) {
  if (section === 'usages') return <UsagesEditor data={data} onChange={onChange} />
  if (section === 'subjects') return <SubjectsEditor data={data} onChange={onChange} />
  if (section === 'conditions') return <ConditionsEditor data={data} onChange={onChange} />
  if (section === 'results') return <ResultsEditor data={data} onChange={onChange} />
  return <PolaritiesEditor data={data} onChange={onChange} />
}

/* ------------------------------ Usos -------------------------------------- */

function UsagesEditor({ data, onChange }: Pick<EditorProps, 'data' | 'onChange'>) {
  const update = (index: number, patch: Partial<ConditionalUsage>) =>
    onChange((d) => ({ ...d, usages: d.usages.map((u, i) => (i === index ? { ...u, ...patch } : u)) }))
  const remove = (index: number) =>
    onChange((d) => ({ ...d, usages: d.usages.filter((_, i) => i !== index) }))
  const add = () =>
    onChange((d) => ({
      ...d,
      usages: [...d.usages, { id: nextId(d.usages, 'u'), label: '', conditionalType: 'first', description: '' }],
    }))

  return (
    <EditorSection
      title="Rodillo 1 · Usage / Meaning"
      description="El uso determina el tipo de condicional (y por tanto la estructura verbal esperada)."
      count={data.usages.length}
      onAdd={add}
      addLabel="+ Uso"
    >
      {data.usages.map((usage, index) => (
        <EditableRow key={usage.id || index} onRemove={() => remove(index)} disabled={data.usages.length <= 1}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Etiqueta">
              <input className="field" value={usage.label} onChange={(e) => update(index, { label: e.target.value })} />
            </Field>
            <Field label="Tipo condicional">
              <select
                className="field"
                value={usage.conditionalType}
                onChange={(e) => update(index, { conditionalType: e.target.value as ConditionalType })}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Descripción">
              <input className="field" value={usage.description} onChange={(e) => update(index, { description: e.target.value })} />
            </Field>
          </div>
        </EditableRow>
      ))}
    </EditorSection>
  )
}

/* ----------------------------- Sujetos ------------------------------------ */

function SubjectsEditor({ data, onChange }: Pick<EditorProps, 'data' | 'onChange'>) {
  const update = (index: number, patch: Partial<ConditionalSubject>) =>
    onChange((d) => ({ ...d, subjects: d.subjects.map((s, i) => (i === index ? { ...s, ...patch } : s)) }))
  const remove = (index: number) =>
    onChange((d) => ({ ...d, subjects: d.subjects.filter((_, i) => i !== index) }))
  const add = () =>
    onChange((d) => ({ ...d, subjects: [...d.subjects, { id: nextId(d.subjects, 's'), label: '', allowedConditions: [] }] }))

  return (
    <EditorSection
      title="Rodillo 2 · Subject (If-Clause)"
      description="Sujeto de la cláusula If. «Condiciones permitidas» limita con qué condiciones puede combinarse (vacío = todas)."
      count={data.subjects.length}
      onAdd={add}
      addLabel="+ Sujeto"
    >
      {data.subjects.map((subject, index) => (
        <EditableRow key={subject.id || index} onRemove={() => remove(index)} disabled={data.subjects.length <= 1}>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Etiqueta / pronombre">
              <input className="field" value={subject.label} placeholder="I, You, He, She…" onChange={(e) => update(index, { label: e.target.value })} />
            </Field>
            <Field label="Condiciones permitidas" hint="Vacío = sin restricción">
              <IdChecklist
                items={data.conditions.map((c) => ({ id: c.id, label: c.verb.base || c.complement }))}
                selected={subject.allowedConditions}
                emptyHint="Añade condiciones para poder restringir."
                onToggle={(id) => {
                  const next = subject.allowedConditions.includes(id)
                    ? subject.allowedConditions.filter((x) => x !== id)
                    : [...subject.allowedConditions, id]
                  update(index, { allowedConditions: next })
                }}
              />
            </Field>
          </div>
        </EditableRow>
      ))}
    </EditorSection>
  )
}

/* ---------------------------- Condiciones --------------------------------- */

function ConditionsEditor({ data, onChange }: Pick<EditorProps, 'data' | 'onChange'>) {
  const update = (index: number, patch: Partial<ConditionalCondition>) =>
    onChange((d) => ({ ...d, conditions: d.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)) }))
  const remove = (index: number) =>
    onChange((d) => ({ ...d, conditions: d.conditions.filter((_, i) => i !== index) }))
  const add = () =>
    onChange((d) => ({
      ...d,
      conditions: [
        ...d.conditions,
        {
          id: nextId(d.conditions, 'c'),
          conditionalType: 'first',
          verb: { base: '', third: '', past: '', participle: '' },
          complement: '',
          allowedSubjects: data.subjects.map((s) => s.id),
          compatibleResults: [],
        },
      ],
    }))

  return (
    <EditorSection
      title="Rodillo 3 · Condition (If-Clause)"
      description="Verbo que sigue al sujeto. «Sujetos permitidos» y «resultados compatibles» definen el encadenamiento."
      count={data.conditions.length}
      onAdd={add}
      addLabel="+ Condición"
    >
      {data.conditions.map((condition, index) => (
        <EditableRow key={condition.id || index} onRemove={() => remove(index)} disabled={data.conditions.length <= 1}>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="ID">
                <input className="field font-mono" value={condition.id} onChange={(e) => update(index, { id: e.target.value })} />
              </Field>
              <Field label="Tipo condicional" className="col-span-1 sm:col-span-2">
                <select
                  className="field"
                  value={condition.conditionalType}
                  onChange={(e) => update(index, { conditionalType: e.target.value as ConditionalType })}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {VERB_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <input
                    className="field"
                    value={condition.verb[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => update(index, { verb: { ...condition.verb, [f.key]: e.target.value } })}
                  />
                </Field>
              ))}
            </div>
            <Field label="Complemento" hint="Lo que va después del verbo (p. ej. «hard», «money»)">
              <input className="field" value={condition.complement} onChange={(e) => update(index, { complement: e.target.value })} />
            </Field>
            <Field label="Sujetos permitidos" hint="Vacío = todos">
              <IdChecklist
                items={data.subjects.map((s) => ({ id: s.id, label: s.label }))}
                selected={condition.allowedSubjects}
                emptyHint="Añade sujetos para poder restringir."
                onToggle={(id) => {
                  const next = condition.allowedSubjects.includes(id)
                    ? condition.allowedSubjects.filter((x) => x !== id)
                    : [...condition.allowedSubjects, id]
                  update(index, { allowedSubjects: next })
                }}
              />
            </Field>
            <Field label="Resultados compatibles" hint="El resultado se elige de esta lista">
              <IdChecklist
                items={data.results.map((r) => ({ id: r.id, label: r.verb.base || r.complement }))}
                selected={condition.compatibleResults}
                emptyHint="Añade resultados en la pestaña «Resultados»."
                onToggle={(id) => {
                  const next = condition.compatibleResults.includes(id)
                    ? condition.compatibleResults.filter((x) => x !== id)
                    : [...condition.compatibleResults, id]
                  update(index, { compatibleResults: next })
                }}
              />
            </Field>
          </div>
        </EditableRow>
      ))}
    </EditorSection>
  )
}

/* ----------------------------- Resultados --------------------------------- */

function ResultsEditor({ data, onChange }: Pick<EditorProps, 'data' | 'onChange'>) {
  const update = (index: number, patch: Partial<ConditionalResult>) =>
    onChange((d) => ({ ...d, results: d.results.map((r, i) => (i === index ? { ...r, ...patch } : r)) }))
  const remove = (index: number) =>
    onChange((d) => ({ ...d, results: d.results.filter((_, i) => i !== index) }))
  const add = () =>
    onChange((d) => ({
      ...d,
      results: [
        ...d.results,
        {
          id: nextId(d.results, 'r'),
          conditionalType: 'first',
          verb: { base: '', third: '', past: '', participle: '' },
          complement: '',
        },
      ],
    }))

  return (
    <EditorSection
      title="Rodillo 4 · Result Action"
      description="Acción del resultado. «Sujeto del resultado» es opcional (p. ej. «it» en el Zero Conditional)."
      count={data.results.length}
      onAdd={add}
      addLabel="+ Resultado"
    >
      {data.results.map((result, index) => (
        <EditableRow key={result.id || index} onRemove={() => remove(index)} disabled={data.results.length <= 1}>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="ID">
                <input className="field font-mono" value={result.id} onChange={(e) => update(index, { id: e.target.value })} />
              </Field>
              <Field label="Tipo condicional" className="col-span-1 sm:col-span-2">
                <select
                  className="field"
                  value={result.conditionalType}
                  onChange={(e) => update(index, { conditionalType: e.target.value as ConditionalType })}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {VERB_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <input
                    className="field"
                    value={result.verb[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => update(index, { verb: { ...result.verb, [f.key]: e.target.value } })}
                  />
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Complemento">
                <input className="field" value={result.complement} onChange={(e) => update(index, { complement: e.target.value })} />
              </Field>
              <Field label="Sujeto del resultado" hint="Opcional · por defecto usa el del If">
                <input
                  className="field"
                  value={result.resultSubject ?? ''}
                  placeholder="it"
                  onChange={(e) => update(index, { resultSubject: e.target.value.trim() || undefined })}
                />
              </Field>
            </div>
          </div>
        </EditableRow>
      ))}
    </EditorSection>
  )
}

/* ----------------------------- Polaridades -------------------------------- */

function PolaritiesEditor({ data, onChange }: Pick<EditorProps, 'data' | 'onChange'>) {
  const update = (index: number, patch: Partial<ConditionalPolarity>) =>
    onChange((d) => ({ ...d, polarities: d.polarities.map((p, i) => (i === index ? { ...p, ...patch } : p)) }))
  const remove = (index: number) =>
    onChange((d) => ({ ...d, polarities: d.polarities.filter((_, i) => i !== index) }))
  const add = () =>
    onChange((d) => ({ ...d, polarities: [...d.polarities, { id: nextId(d.polarities, 'p'), label: '' }] }))

  return (
    <EditorSection
      title="Rodillo 5 · Polarity & Stance"
      description="El id «pos» y «neg» activan la lógica de negación. Otros ids solo cambian la etiqueta."
      count={data.polarities.length}
      onAdd={add}
      addLabel="+ Polaridad"
    >
      {data.polarities.map((polarity, index) => (
        <EditableRow key={polarity.id || index} onRemove={() => remove(index)} disabled={data.polarities.length <= 1}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="ID" hint="Usa «pos» o «neg» para la negación">
              <input className="field font-mono" value={polarity.id} onChange={(e) => update(index, { id: e.target.value })} />
            </Field>
            <Field label="Etiqueta" className="sm:col-span-2">
              <input className="field" value={polarity.label} onChange={(e) => update(index, { label: e.target.value })} />
            </Field>
          </div>
        </EditableRow>
      ))}
    </EditorSection>
  )
}
