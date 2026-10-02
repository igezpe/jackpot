import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}

/** Etiqueta + control con un layout consistente en todo el editor. */
export function Field({ label, hint, children, className = '' }: FieldProps) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block text-[0.65rem] font-semibold tracking-[0.14em] text-slate-400 uppercase">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[0.65rem] text-slate-500">{hint}</span> : null}
    </label>
  )
}

interface SectionProps {
  title: string
  description: string
  count: number
  onAdd: () => void
  addLabel: string
  children: ReactNode
}

/** Cabecera de cada rodillo dentro del editor + botón de "añadir". */
export function EditorSection({ title, description, count, onAdd, addLabel, children }: SectionProps) {
  return (
    <section className="animate-rise">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-gold-200">
            {title}{' '}
            <span className="ml-1 rounded-md bg-white/5 px-1.5 py-0.5 align-middle text-xs font-semibold text-slate-400">
              {count}
            </span>
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-lg border border-gold-400/40 bg-gold-400/10 px-3 py-1.5 text-xs font-bold tracking-wide text-gold-200 uppercase transition hover:bg-gold-400/20"
        >
          {addLabel}
        </button>
      </header>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}

interface RowProps {
  onRemove: () => void
  disabled?: boolean
  children: ReactNode
}

/** Fila de edición con su botón de eliminar. */
export function EditableRow({ onRemove, disabled = false, children }: RowProps) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-night-950/50 p-3 transition hover:border-white/20">
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        title="Eliminar"
        aria-label="Eliminar elemento"
        className="absolute top-2.5 right-2.5 z-10 grid size-7 place-items-center rounded-lg border border-white/10 bg-night-900 text-slate-500 transition hover:border-candy-400/50 hover:bg-candy-500/20 hover:text-candy-300 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
      {children}
    </div>
  )
}