import { AlertIcon, CheckIcon } from './icons'
import type { ConditionalValidationResult } from '../lib/conditionals'

interface ConditionalFeedbackProps {
  result: ConditionalValidationResult
  /** Para animar el mensaje cada vez que cambia. */
  nonce: number
}

/**
 * Card de resultado para la sección de condicionales, con el mismo estilo
 * que `Feedback` (verde si es correcto, roja si hay errores).
 */
export function ConditionalFeedback({ result, nonce }: ConditionalFeedbackProps) {
  const tone = result.isValid
    ? {
        ring: 'border-neon-400/50',
        bg: 'bg-neon-500/10',
        icon: 'bg-neon-400/20 text-neon-300',
        title: 'text-neon-300',
      }
    : {
        ring: 'border-candy-400/50',
        bg: 'bg-candy-500/10',
        icon: 'bg-candy-400/20 text-candy-300',
        title: 'text-candy-300',
      }

  return (
    <section
      key={nonce}
      aria-live="polite"
      className={`animate-rise mt-4 rounded-2xl border ${tone.ring} ${tone.bg} p-4 sm:p-5`}
    >
      <header className="flex items-center gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone.icon}`}>
          {result.isValid ? <CheckIcon className="size-5" /> : <AlertIcon className="size-5" />}
        </span>
        <div className="min-w-0">
          <h3 className={`font-display text-lg leading-tight font-bold ${tone.title}`}>
            {result.isValid ? '🎉 ¡Jackpot! Condicional correcta' : '❌ Casi, revisa esto'}
          </h3>
          <p className="text-xs text-slate-400">
            {result.isValid
              ? 'La estructura y las formas verbales son correctas.'
              : '1 problema que corregir.'}
          </p>
        </div>
      </header>

      {!result.isValid && (
        <ul className="mt-4 space-y-2">
          <li className="flex gap-2.5 text-sm text-slate-100">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-candy-400/20 text-[0.65rem] font-bold text-candy-300">
              1
            </span>
            <span className="leading-relaxed">{result.feedback}</span>
          </li>
        </ul>
      )}
    </section>
  )
}
