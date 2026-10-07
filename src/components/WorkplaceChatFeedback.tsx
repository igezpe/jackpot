import { AlertIcon, BulbIcon, CheckIcon } from './icons'
import type { ChatValidationResult } from '../lib/workplaceChat'

interface WorkplaceChatFeedbackProps {
  result: ChatValidationResult
  nonce: number
}

/** Card de resultado para el Workplace Chat (mismo estilo que las otras secciones). */
export function WorkplaceChatFeedback({ result, nonce }: WorkplaceChatFeedbackProps) {
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
            {result.isValid ? '🎉 ¡Correcto! Buen inglés' : '❌ Casi, revisa esto'}
          </h3>
          <p className="text-xs text-slate-400">
            {result.isValid
              ? 'La respuesta coincide con una variante válida.'
              : result.feedback}
          </p>
        </div>
      </header>

      {result.isValid && result.matchedVariant && (
        <p className="mt-3 text-sm text-slate-300">
          Coincidió con: <span className="font-mono text-neon-200">{result.matchedVariant}</span>
        </p>
      )}

      {!result.isValid && result.model && (
        <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <li className="flex gap-2.5 text-sm text-gold-200/90">
            <BulbIcon className="mt-0.5 size-4 shrink-0 text-gold-400" />
            <span className="leading-relaxed">
              Respuesta modelo: <span className="font-mono">{result.model}</span>
            </span>
          </li>
        </ul>
      )}
    </section>
  )
}
