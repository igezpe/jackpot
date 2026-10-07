import { useMemo, useState } from 'react'
import type { ConditionalData } from '../../lib/conditionals'
import {
  sanitizeConditionalData,
  validateConditionalSchema,
  type ConditionalSchemaReport,
} from '../../lib/conditionalsStorage'

interface RawConditionalsJsonEditorProps {
  data: ConditionalData
  /** Se llama sólo si el JSON es válido. */
  onApply: (data: ConditionalData) => void
}

/** Vista avanzada: edición directa del JSON de condicionales con validación. */
export function RawConditionalsJsonEditor({ data, onApply }: RawConditionalsJsonEditorProps) {
  const initial = useMemo(() => JSON.stringify(data, null, 2), [data])
  const [text, setText] = useState(initial)
  const [report, setReport] = useState<ConditionalSchemaReport | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const dirty = text !== initial

  const apply = () => {
    setParseError(null)
    setReport(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'JSON no válido.')
      return
    }
    const result = validateConditionalSchema(parsed)
    setReport(result)
    if (!result.ok) return
    const clean = sanitizeConditionalData(parsed)
    if (clean) onApply(clean)
  }

  const format = () => {
    try {
      setText(JSON.stringify(JSON.parse(text), null, 2))
      setParseError(null)
      setReport(null)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'JSON no válido.')
    }
  }

  const restore = () => {
    setText(initial)
    setParseError(null)
    setReport(null)
  }

  return (
    <div className="animate-rise space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="font-display text-base font-bold text-gold-200">Editor JSON</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Pega la configuración completa de condicionales. Se valida antes de aplicarse.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={format}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/25 hover:text-white"
          >
            Formatear
          </button>
          <button
            type="button"
            onClick={restore}
            disabled={!dirty}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            Descartar
          </button>
        </div>
      </header>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        aria-label="Configuración JSON de condicionales"
        className="field h-80 resize-y font-mono text-[0.8rem] leading-relaxed"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={apply}
          disabled={!dirty}
          className="rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-4 py-2 text-xs font-extrabold tracking-wide text-night-950 uppercase transition hover:from-gold-200 hover:to-gold-400 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600 disabled:text-slate-400"
        >
          Aplicar cambios
        </button>
        {dirty && <span className="text-xs text-gold-300">Hay cambios sin aplicar.</span>}
      </div>

      {parseError && <Message tone="error" title="JSON no válido" items={[parseError]} />}
      {report && report.errors.length > 0 && (
        <Message tone="error" title="La configuración no cumple el esquema" items={report.errors} />
      )}
      {report && report.ok && report.warnings.length > 0 && (
        <Message tone="warn" title="Aplicado con avisos" items={report.warnings} />
      )}
      {report && report.ok && report.warnings.length === 0 && (
        <Message tone="ok" title="Configuración aplicada correctamente" items={[]} />
      )}
    </div>
  )
}

function Message({ tone, title, items }: { tone: 'ok' | 'warn' | 'error'; title: string; items: string[] }) {
  const styles = {
    ok: 'border-neon-400/40 bg-neon-500/10 text-neon-200',
    warn: 'border-gold-400/40 bg-gold-400/10 text-gold-200',
    error: 'border-candy-400/40 bg-candy-500/10 text-candy-200',
  }[tone]

  return (
    <div className={`animate-rise rounded-xl border px-4 py-3 ${styles}`}>
      <p className="text-sm font-semibold">{title}</p>
      {items.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
