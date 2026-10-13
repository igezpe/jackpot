import type { OrderRequestItem } from '../../lib/ordersRequests'
import { OR_CATEGORIES } from '../../lib/ordersRequests'
import { EditableRow, EditorSection, Field } from './fields'

interface OrdersRequestsEditorProps {
  items: OrderRequestItem[]
  onChange: (updater: (current: OrderRequestItem[]) => OrderRequestItem[]) => void
}

const variantsToText = (variants: string[]): string => variants.join('\n')
const textToVariants = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

function nextId(items: OrderRequestItem[]): string {
  const nums = items
    .map((p) => Number.parseInt(p.id.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `or_${max + 1}`
}

/** Lista de órdenes/peticiones con edición en línea. */
export function OrdersRequestsEditor({ items, onChange }: OrdersRequestsEditorProps) {
  const update = (index: number, patch: Partial<OrderRequestItem>) =>
    onChange((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)))

  const remove = (index: number) =>
    onChange((current) => current.filter((_, i) => i !== index))

  const add = () =>
    onChange((current) => [
      ...current,
      {
        id: nextId(current),
        directSentence: '',
        introContext: 'John told me...',
        expectedVariants: [],
        category: 'Order [+]',
        difficultyWeight: 1,
      },
    ])

  return (
    <EditorSection
      title="Orders & Requests"
      description="La oración directa y el verbo introductorio son la pista. Las variantes esperadas (con y sin introductor) se aceptan al validar."
      count={items.length}
      onAdd={add}
      addLabel="+ Ítem"
    >
      {items.map((item, index) => (
        <EditableRow key={item.id || index} onRemove={() => remove(index)} disabled={items.length <= 1}>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Oración directa" className="sm:col-span-2">
                <input
                  className="field"
                  value={item.directSentence}
                  placeholder="Send me the report before lunch"
                  onChange={(e) => update(index, { directSentence: e.target.value })}
                />
              </Field>
              <Field label="Tipo">
                <input
                  className="field"
                  list="or-categories"
                  value={item.category}
                  placeholder="Order [+]"
                  onChange={(e) => update(index, { category: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Verbo introductorio" hint="Se muestra como contexto en el juego">
              <input
                className="field"
                value={item.introContext}
                placeholder="John told me..."
                onChange={(e) => update(index, { introContext: e.target.value })}
              />
            </Field>
            <Field
              label="Variantes esperadas"
              hint="Una por línea · con y sin introductor (todas se aceptan)"
            >
              <textarea
                className="field min-h-20 resize-y font-mono text-[0.8rem]"
                rows={3}
                value={variantsToText(item.expectedVariants)}
                placeholder={'John told me to send him the report before lunch\nto send him the report before lunch'}
                onChange={(e) => update(index, { expectedVariants: textToVariants(e.target.value) })}
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

      <datalist id="or-categories">
        {OR_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </EditorSection>
  )
}
