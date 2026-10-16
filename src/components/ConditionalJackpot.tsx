import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConditionalData, ConditionalValidationResult } from '../lib/conditionals'
import { buildConditionalSentence, validateConditionalAnswer } from '../lib/conditionals'
import { useConditionalSlotMachine } from '../hooks/useConditionalSlotMachine'
import { Reel } from './Reel'
import { ConditionalFeedback } from './ConditionalFeedback'
import { DiceIcon, GearIcon } from './icons'

interface ConditionalJackpotProps {
  data: ConditionalData
  onOpenConfig: () => void
  onResult: (correct: boolean) => void
}

/**
 * Sección «Conditionals Jackpot»: 5 rodillos con la misma animación de cinta
 * que el Jackpot Gramatical, encadenados semánticamente.
 */
const ConditionalJackpot = ({ data, onOpenConfig, onResult }: ConditionalJackpotProps) => {
  const { combo, reels, spinning, spinToken, spin } = useConditionalSlotMachine(data)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<ConditionalValidationResult | null>(null)
  const [showExample, setShowExample] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const spinRef = useRef<HTMLButtonElement>(null)
  const [hasSpun, setHasSpun] = useState(false)

  const handleSpin = useCallback(() => {
    setResult(null)
    setShowExample(false)
    setAnswer('')
    setHasSpun(true)
    spin()
  }, [spin])

  const check = useCallback(() => {
    if (answer.trim().length === 0) return
    const outcome = validateConditionalAnswer(answer, combo)
    setResult(outcome)
    setAttempt((n) => n + 1)
    setShowExample(false)
    onResult(outcome.isValid)
    // Correcta → foco en «Tirar»; incorrecta → se queda en el input.
    requestAnimationFrame(() => {
      if (outcome.isValid) spinRef.current?.focus()
      else inputRef.current?.focus()
    })
  }, [answer, combo, onResult])

  // Al terminar la tirada, llevar el foco al cuadro de texto.
  useEffect(() => {
    if (hasSpun && !spinning) {
      inputRef.current?.focus()
    }
  }, [hasSpun, spinning])

  const model = buildConditionalSentence(combo)
  const canValidate = !spinning && answer.trim().length > 0

  return (
    <div className="panel relative mt-6 overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-gold-gradient text-lg font-extrabold uppercase">
            Conditionals Jackpot
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Tira los 5 rodillos: las opciones se encadenan para que la oración tenga sentido.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenConfig}
          aria-label="Configuración de condicionales"
          title="Configuración de condicionales"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-night-900/70 text-slate-300 transition hover:border-gold-400/50 hover:text-gold-300"
        >
          <GearIcon className="size-5" />
        </button>
      </div>

      {/* Máquina: 5 rodillos */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {reels.map((reel, i) => (
          <Reel
            key={reel.key}
            index={i + 1}
            title={reel.title}
            items={reel.items}
            current={reel.value}
            target={reel.target}
            spinning={spinning}
            spinToken={spinToken}
            delay={reel.delay}
            accentClass={reel.accentClass}
          />
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={handleSpin}
          ref={spinRef}
          disabled={spinning}
          className={`font-display group relative inline-flex items-center gap-3 rounded-2xl px-10 py-4 text-lg font-extrabold tracking-[0.15em] uppercase transition ${
            spinning
              ? 'cursor-wait border border-white/10 bg-white/5 text-slate-500'
              : 'animate-pulse-ring bg-gradient-to-b from-gold-300 via-gold-400 to-gold-600 text-night-950 shadow-xl shadow-gold-500/30 hover:from-gold-200 hover:via-gold-300 hover:to-gold-500 active:translate-y-px'
          }`}
        >
          {spinning ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              Girando
            </>
          ) : (
            <>
              <DiceIcon className="size-6 transition group-hover:rotate-12" />
              Tirar
            </>
          )}
        </button>
      </div>

      {/* Respuesta */}
      <div className="mt-6">
        <label className="block text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
          Tu oración en inglés
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Transforma los rodillos en una condicional. El sistema tolera que escribas o no la palabra{' '}
          <span className="font-mono">If</span>.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-xl border border-gold-400/40 bg-gold-400/10 px-3 py-2 font-mono text-sm text-gold-200">
            If
          </span>
          <input
            ref={inputRef}
            className="field w-full"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (canValidate) check()
              }
            }}
            placeholder="… (por ejemplo: I studied hard, I would pass)"
            disabled={spinning}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={check}
            disabled={!canValidate}
            className="rounded-2xl bg-gradient-to-b from-gold-300 via-gold-400 to-gold-600 px-5 py-2 text-sm font-bold text-night-950 transition hover:from-gold-200 hover:via-gold-300 disabled:opacity-50"
          >
            COMPROBAR
          </button>
          <button
            type="button"
            onClick={() => setShowExample((v) => !v)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-gold-400/50 hover:text-gold-300"
          >
            {showExample ? 'Ocultar ejemplo' : 'Ver ejemplo'}
          </button>
        </div>

        {showExample && (
          <p className="mt-3 rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-night-200">
            <span className="text-slate-500">Oración modelo: </span>
            <span className="font-mono">{model}</span>
          </p>
        )}

        {result && <ConditionalFeedback result={result} nonce={attempt} />}
      </div>
    </div>
  )
}

export default ConditionalJackpot
