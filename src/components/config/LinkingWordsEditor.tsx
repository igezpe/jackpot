import type { LinkingWordItem } from '../../lib/linkingWords'
import { RELATION_TYPES } from '../../lib/linkingWords'
import { EditableRow, EditorSection, Field } from './fields'

interface LinkingWordsEditorProps {
  items: LinkingWordItem[]
  onChange: (updater: (current: LinkingWordItem[]) => LinkingWordItem[]) => void
}

const listToText = (list: string[]): string => list.join('\n')
const textToList = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

function nextId(items: LinkingWordItem[]): string {
  const nums = items
    .map((p) => Number.parseInt(p.id.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `lw_${max + 1}`
}

/** Lista de pares de ideas con sus conectores, con edición en línea. */
export function LinkingWordsEditor({ items, onChange }: LinkingWordsEditorProps) {
  const update = (index: number, patch: Partial<LinkingWordItem>) =>
    onChange((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)))

  const remove = (index: number) =>
    onChange((current) => current.filter((_, i) => i !== index))

  const add = () =>
    onChange((current) => [
      ...current,
      {
        id: nextId(current),
        ideaA: '',
        ideaB: '',
        relationType: 'contrast',
        relationLabel: 'Contrast [ Sin embargo / Pero ]',
        validConnectors: [],
        exampleFullSentence: '',
        category: 'General',
        difficultyWeight: 1,
      },
    ])

  const categories = Array.from(
    new Set(items.map((item) => item.category).filter((c) => c.length > 0)),
  )

  return (
    <EditorSection
      title="Linking Words"
      description="Cada ítem une Idea A + conector + Idea B. En cada ronda se elige al azar uno de los conectores válidos como opción correcta; los demás no se ofrecen como distractores. La oración de ejemplo se usa cuando coincide con el primero."
      count={items.length}
      onAdd={add}
      addLabel="+ Ítem"
    >
      {items.map((item, index) => (
        <EditableRow key={item.id || index} onRemove={() => remove(index)} disabled={items.length <= 1}>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Idea A">
                <textarea
                  className="field min-h-16 resize-y"
                  rows={2}
                  value={item.ideaA}
                  placeholder="The setup is complete"
                  onChange={(e) => update(index, { ideaA: e.target.value })}
                />
              </Field>
              <Field label="Idea B">
                <textarea
                  className="field min-h-16 resize-y"
                  rows={2}
                  value={item.ideaB}
                  placeholder="we still need to run the tests"
                  onChange={(e) => update(index, { ideaB: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Tipo de relación">
                <input
                  className="field font-mono"
                  list="lw-relation-types"
                  value={item.relationType}
                  placeholder="contrast"
                  onChange={(e) => update(index, { relationType: e.target.value })}
                />
              </Field>
              <Field label="Etiqueta de relación" className="sm:col-span-2" hint="Se muestra en el rodillo 2">
                <input
                  className="field"
                  value={item.relationLabel}
                  placeholder="Contrast [ Sin embargo / Pero ]"
                  onChange={(e) => update(index, { relationLabel: e.target.value })}
                />
              </Field>
            </div>

            <Field
              label="Conectores válidos"
              hint="Uno por línea · en cada ronda se elige uno al azar como correcto"
            >
              <textarea
                className="field min-h-20 resize-y font-mono text-[0.8rem]"
                rows={3}
                value={listToText(item.validConnectors)}
                placeholder={'however\nbut\nthough\nstill'}
                onChange={(e) => update(index, { validConnectors: textToList(e.target.value) })}
              />
            </Field>

            <Field label="Oración completa de ejemplo" hint="Se usa para el primer conector; con los demás se genera la oración">
              <textarea
                className="field min-h-16 resize-y font-mono text-[0.8rem]"
                rows={2}
                value={item.exampleFullSentence}
                placeholder="The setup is complete; however, we still need to run the tests."
                onChange={(e) => update(index, { exampleFullSentence: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Categoría" className="sm:col-span-2">
                <input
                  className="field"
                  list="lw-categories"
                  value={item.category}
                  placeholder="Despliegues / Pruebas"
                  onChange={(e) => update(index, { category: e.target.value })}
                />
              </Field>
              <div className="flex items-end gap-2 pb-1">
                <span className="rounded-md bg-white/5 px-2 py-1 text-[0.65rem] font-semibold text-slate-400">
                  id: {item.id}
                </span>
                <span className="rounded-md bg-gold-400/10 px-2 py-1 text-[0.65rem] font-semibold text-gold-200">
                  peso: {item.difficultyWeight}
                </span>
              </div>
            </div>
          </div>
        </EditableRow>
      ))}

      <datalist id="lw-relation-types">
        {RELATION_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <datalist id="lw-categories">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </EditorSection>
  )
}
