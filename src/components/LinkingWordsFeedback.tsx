import { AlertIcon, BulbIcon, CheckIcon } from './icons'
import type { LinkingSelectionResult } from '../lib/linkingWords'

interface LinkingWordsFeedbackProps {
  result: LinkingSelectionResult
  nonce: number
}

/** Card de resultado para Linking Words (misma línea gráfica que las demás). */
export function LinkingWordsFeedback({ result, nonce }: LinkingWordsFeedbackProps) {
  const tone = result.isCorrect
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
          {result.isCorrect ? <CheckIcon className="size-5" /> : <AlertIcon className="size-5" />}
        </span>
        <div className="min-w-0">
          <h3 className={`font-display text-lg leading-tight font-bold ${tone.title}`}>
            {result.isCorrect ? '🎉 ¡Correcto! Buen conector' : '❌ Casi, revisa esto'}
          </h3>
          <p className="text-xs text-slate-400">
            {result.isCorrect
              ? 'Elegiste el conector que encaja con la relación.'
              : 'Ese conector no encaja con la relación pedida.'}
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-300">
        <p>
          Elegiste: <span className="font-mono text-slate-100">{result.selected}</span>
        </p>
        {!result.isCorrect && (
          <p>
            Correcto: <span className="font-mono font-semibold text-neon-200">{result.correct}</span>
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-night-950/40 p-3">
        <p className="flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.18em] text-slate-400 uppercase">
          <BulbIcon className="size-4 shrink-0 text-gold-400" /> Oración completa
        </p>
        <p className="mt-1 font-mono text-sm leading-relaxed text-gold-200">
          {result.fullSentence}
        </p>
      </div>
    </section>
  )
}
