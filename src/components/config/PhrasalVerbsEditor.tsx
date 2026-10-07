import type { PhrasalVerbItem } from '../../lib/phrasalVerbs'
import { PHRASAL_CATEGORIES } from '../../lib/phrasalVerbs'
import { EditableRow, EditorSection, Field } from './fields'

interface PhrasalVerbsEditorProps {
  items: PhrasalVerbItem[]
  onChange: (updater: (current: PhrasalVerbItem[]) => PhrasalVerbItem[]) => void
}

const variantsToText = (variants: string[]): string => variants.join('\n')
const textToVariants = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

function nextId(items: PhrasalVerbItem[]): string {
  const nums = items
    .map((p) => Number.parseInt(p.id.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `pv_${max + 1}`
}

/** Lista de phrasal verbs con edición en línea. */
export function PhrasalVerbsEditor({ items, onChange }: PhrasalVerbsEditorProps) {
  const update = (index: number, patch: Partial<PhrasalVerbItem>) =>
    onChange((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)))

  const remove = (index: number) =>
    onChange((current) => current.filter((_, i) => i !== index))

  const add = () =>
    onChange((current) => [
      ...current,
      {
        id: nextId(current),
        spanish: '',
        phrasalVerb: '',
        variants: [],
        exampleContext: '',
        category: 'Planificación',
        difficultyWeight: 1,
      },
    ])

  return (
    <EditorSection
      title="Phrasal Verbs"
      description="El significado en español y la frase con hueco (________) son la pista. Las variantes y sinónimos se aceptan al validar."
      count={items.length}
      onAdd={add}
      addLabel="+ Phrasal verb"
    >
      {items.map((item, index) => (
        <EditableRow key={item.id || index} onRemove={() => remove(index)} disabled={items.length <= 1}>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Significado (ES)">
                <input
                  className="field"
                  value={item.spanish}
                  placeholder="Revisar / Repasar"
                  onChange={(e) => update(index, { spanish: e.target.value })}
                />
              </Field>
              <Field label="Phrasal verb principal">
                <input
                  className="field font-mono"
                  value={item.phrasalVerb}
                  placeholder="go over"
                  onChange={(e) => update(index, { phrasalVerb: e.target.value })}
                />
              </Field>
              <Field label="Categoría">
                <input
                  className="field"
                  list="phrasal-categories"
                  value={item.category}
                  placeholder="Planificación"
                  onChange={(e) => update(index, { category: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Variantes / sinónimos" hint="Una por línea · todas se aceptan">
              <textarea
                className="field min-h-16 resize-y font-mono text-[0.8rem]"
                rows={2}
                value={variantsToText(item.variants)}
                placeholder={'go over\ncheck over\nlook over'}
                onChange={(e) => update(index, { variants: textToVariants(e.target.value) })}
              />
            </Field>
            <Field label="Oración de contexto" hint="Usa ________ para el hueco">
              <input
                className="field"
                value={item.exampleContext}
                placeholder="I need to ________ the report before the meeting."
                onChange={(e) => update(index, { exampleContext: e.target.value })}
              />
            </Field>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/5 px-2 py-1 text-[0.65rem] font-semibold text-slate-400">
                id: {item.id}
              </span>
              <span className="rounded-md bg-gold-400/10 px-2 py-1 text-[0.65rem] font-semibold text-gold-200">
                peso: {item.difficultyWeight}
              </span>
            </div>
          </div>
        </EditableRow>
      ))}

      <datalist id="phrasal-categories">
        {PHRASAL_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </EditorSection>
  )
}
