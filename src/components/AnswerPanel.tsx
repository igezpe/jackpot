import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { ValidationResult } from '../lib/validator'
import { BulbIcon } from './icons'
import { Feedback } from './Feedback'

interface AnswerPanelProps {
  answer: string
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  /** El campo se bloquea mientras giran los rodillos. */
  disabled: boolean
  result: ValidationResult | null
  /** Número de intentos; fuerza la animación del mensaje. */
  attempt: number
  showExample: boolean
  onToggleExample: () => void
  placeholder: string
  /** Oración modelo de la combinación actual. */
  example: string
  /** Ref al input, para poder enfocarlo desde fuera (p. ej. al fallar). */
  inputRef?: RefObject<HTMLInputElement | null>
}

export function AnswerPanel({
  answer,
  onAnswerChange,
  onSubmit,
  disabled,
  result,
  attempt,
  showExample,
  onToggleExample,
  placeholder,
  example,
  inputRef,
}: AnswerPanelProps) {
  const localRef = useRef<HTMLInputElement>(null)
  const fieldRef = inputRef ?? localRef

  // Al terminar la tirada el foco va directo al campo: se puede responder ya.
  useEffect(() => {
    if (!disabled) fieldRef.current?.focus()
  }, [disabled, fieldRef])

  return (
    <div className="panel mt-6 p-5 sm:p-6">
      <label
        htmlFor="answer"
        className="font-display flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-300 uppercase"
      >
        Tu oración en inglés
      </label>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="answer"
          ref={fieldRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="sentences"
          spellCheck={false}
          disabled={disabled}
          value={answer}
          placeholder={placeholder}
          onChange={(event) => onAnswerChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !disabled) {
              event.preventDefault()
              onSubmit()
            }
          }}
          className="field flex-1 py-3 font-mono text-base tracking-tight disabled:opacity-50"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || answer.trim().length === 0}
            className="font-display flex-1 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-5 py-3 text-sm font-extrabold tracking-wide text-night-950 uppercase shadow-lg shadow-gold-500/25 transition hover:from-gold-200 hover:to-gold-400 active:translate-y-px disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600 disabled:text-slate-400 disabled:shadow-none sm:flex-none"
          >
            Comprobar
          </button>
          <button
            type="button"
            onClick={onToggleExample}
            aria-pressed={showExample}
            title="Ver una oración de ejemplo"
            aria-label="Ver una oración de ejemplo"
            className="grid size-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-gold-300 transition hover:border-gold-400/50 hover:bg-gold-400/10"
          >
            <BulbIcon className="size-5" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Pulsa <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">Enter</kbd> para
        comprobar.
      </p>

      {showExample && (
        <div className="animate-pop mt-3 rounded-xl border border-gold-400/30 bg-gold-400/10 px-4 py-3">
          <p className="text-[0.65rem] font-bold tracking-[0.18em] text-gold-400/80 uppercase">
            Oración de ejemplo
          </p>
          <p className="mt-1 font-mono text-sm text-gold-200">{example}</p>
        </div>
      )}

      {result && <Feedback result={result} nonce={attempt} />}
    </div>
  )
}