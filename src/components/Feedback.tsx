import { AlertIcon, BulbIcon, CheckIcon } from './icons'
import type { ValidationResult } from '../lib/validator'

interface FeedbackProps {
  result: ValidationResult
  /** Para animar el mensaje de éxito cada vez que cambia. */
  nonce: number
}

export function Feedback({ result, nonce }: FeedbackProps) {
  const tone = result.valid
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
      // `nonce` fuerza el remount para reiniciar la animación en cada intento.
      key={nonce}
      aria-live="polite"
      className={`animate-rise mt-5 rounded-2xl border ${tone.ring} ${tone.bg} p-4 sm:p-5`}
    >
      <header className="flex items-center gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone.icon}`}>
          {result.valid ? <CheckIcon className="size-5" /> : <AlertIcon className="size-5" />}
        </span>
        <div className="min-w-0">
          <h3 className={`font-display text-lg leading-tight font-bold ${tone.title}`}>
            {result.valid ? '🎉 ¡Jackpot! Oración correcta' : '❌ Casi, revisa esto'}
          </h3>
          <p className="text-xs text-slate-400">
            {result.valid
              ? 'La estructura, la conjugación y los marcadores son correctos.'
              : `${result.errors.length} ${result.errors.length === 1 ? 'problema' : 'problemas'} que corregir.`}
          </p>
        </div>
      </header>

      {result.errors.length > 0 && (
        <ul className="mt-4 space-y-2">
          {result.errors.map((issue, i) => (
            <li
              // eslint-disable-next-line react/no-array-index-key
              key={`${issue.code}-${i}`}
              className="flex gap-2.5 text-sm text-slate-100"
            >
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-candy-400/20 text-[0.65rem] font-bold text-candy-300">
                {i + 1}
              </span>
              <span className="leading-relaxed">{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      {result.warnings.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
          {result.warnings.map((issue, i) => (
            <li
              // eslint-disable-next-line react/no-array-index-key
              key={`${issue.code}-${i}`}
              className="flex gap-2.5 text-sm text-gold-200/90"
            >
              <BulbIcon className="mt-0.5 size-4 shrink-0 text-gold-400" />
              <span className="leading-relaxed">{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}