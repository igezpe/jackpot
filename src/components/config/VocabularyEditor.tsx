import type { VocabItem } from '../../lib/vocabulary'
import { VOCAB_CATEGORIES } from '../../lib/vocabulary'
import { EditableRow, EditorSection, Field } from './fields'

interface VocabularyEditorProps {
  items: VocabItem[]
  onChange: (updater: (current: VocabItem[]) => VocabItem[]) => void
}

const variantsToText = (variants: string[]): string => variants.join('\n')
const textToVariants = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

function nextId(items: VocabItem[]): string {
  const nums = items
    .map((p) => Number.parseInt(p.id.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `voc_${max + 1}`
}

/** Lista de términos de vocabulario con edición en línea. */
export function VocabularyEditor({ items, onChange }: VocabularyEditorProps) {
  const update = (index: number, patch: Partial<VocabItem>) =>
    onChange((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)))

  const remove = (index: number) =>
    onChange((current) => current.filter((_, i) => i !== index))

  const add = () =>
    onChange((current) => [
      ...current,
      {
        id: nextId(current),
        spanish: '',
        english: '',
        variants: [],
        category: 'Expresiones fijas',
        difficultyWeight: 1,
      },
    ])

  return (
    <EditorSection
      title="Vocabulario"
      description="El término en español y su traducción principal. Las variantes y plurales se aceptan al validar."
      count={items.length}
      onAdd={add}
      addLabel="+ Término"
    >
      {items.map((item, index) => (
        <EditableRow key={item.id || index} onRemove={() => remove(index)} disabled={items.length <= 1}>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Término (ES)">
                <input
                  className="field"
                  value={item.spanish}
                  placeholder="Codo"
                  onChange={(e) => update(index, { spanish: e.target.value })}
                />
              </Field>
              <Field label="Inglés principal">
                <input
                  className="field font-mono"
                  value={item.english}
                  placeholder="elbow"
                  onChange={(e) => update(index, { english: e.target.value })}
                />
              </Field>
              <Field label="Categoría">
                <input
                  className="field"
                  list="vocab-categories"
                  value={item.category}
                  placeholder="Cuerpo - Externo"
                  onChange={(e) => update(index, { category: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Variantes / sinónimos / plurales" hint="Una por línea · todas se aceptan">
              <textarea
                className="field min-h-16 resize-y font-mono text-[0.8rem]"
                rows={2}
                value={variantsToText(item.variants)}
                placeholder={'intestine\nintestines\ngut\nbowel'}
                onChange={(e) => update(index, { variants: textToVariants(e.target.value) })}
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

      <datalist id="vocab-categories">
        {VOCAB_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </EditorSection>
  )
}
