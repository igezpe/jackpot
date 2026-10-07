import type { ChatPhrase } from '../../lib/workplaceChat'
import { CHAT_CATEGORIES } from '../../lib/workplaceChat'
import { EditableRow, EditorSection, Field } from './fields'

interface WorkplaceChatEditorProps {
  phrases: ChatPhrase[]
  onChange: (updater: (current: ChatPhrase[]) => ChatPhrase[]) => void
}

const variantsToText = (variants: string[]): string => variants.join('\n')
const textToVariants = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

function nextId(phrases: ChatPhrase[]): string {
  const nums = phrases
    .map((p) => Number.parseInt(p.id.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `chat_${max + 1}`
}

/** Lista de frases con edición en línea (frase, variantes, categoría y peso). */
export function WorkplaceChatEditor({ phrases, onChange }: WorkplaceChatEditorProps) {
  const update = (index: number, patch: Partial<ChatPhrase>) =>
    onChange((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)))

  const remove = (index: number) =>
    onChange((current) => current.filter((_, i) => i !== index))

  const add = () =>
    onChange((current) => [
      ...current,
      {
        id: nextId(current),
        spanish: '',
        englishVariants: [''],
        category: 'Chat rápido',
        difficultyWeight: 1,
      },
    ])

  return (
    <EditorSection
      title="Frases de Workplace Chat"
      description="Cada frase admite varias variantes válidas en inglés. El peso indica la frecuencia con la que aparece (mayor = más seguido)."
      count={phrases.length}
      onAdd={add}
      addLabel="+ Frase"
    >
      {phrases.map((phrase, index) => (
        <EditableRow
          key={phrase.id || index}
          onRemove={() => remove(index)}
          disabled={phrases.length <= 1}
        >
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Frase en español">
                <input
                  className="field"
                  value={phrase.spanish}
                  placeholder="Ya me pongo con eso"
                  onChange={(e) => update(index, { spanish: e.target.value })}
                />
              </Field>
              <Field label="Categoría / Tono">
                <input
                  className="field"
                  list="chat-categories"
                  value={phrase.category}
                  placeholder="Chat rápido"
                  onChange={(e) => update(index, { category: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Variantes en inglés" hint="Una por línea · todas se aceptan">
              <textarea
                className="field min-h-20 resize-y font-mono text-[0.8rem]"
                rows={3}
                value={variantsToText(phrase.englishVariants)}
                placeholder={'On it!\nDoing that right now'}
                onChange={(e) => update(index, { englishVariants: textToVariants(e.target.value) })}
              />
            </Field>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/5 px-2 py-1 text-[0.65rem] font-semibold text-slate-400">
                id: {phrase.id}
              </span>
              <span className="rounded-md bg-gold-400/10 px-2 py-1 text-[0.65rem] font-semibold text-gold-200">
                peso: {phrase.difficultyWeight}
              </span>
            </div>
          </div>
        </EditableRow>
      ))}

      <datalist id="chat-categories">
        {CHAT_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </EditorSection>
  )
}
