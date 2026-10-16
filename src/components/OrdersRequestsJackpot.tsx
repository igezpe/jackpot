import { useCallback, useEffect, useRef, useState } from 'react'
import type { OrderRequestItem, OrderRequestValidationResult } from '../lib/ordersRequests'
import { acceptedVariants, validateOrderAnswer, weightedPick } from '../lib/ordersRequests'
import { PlayingCard } from './PlayingCard'
import { OrdersRequestsFeedback } from './OrdersRequestsFeedback'
import { CardsIcon, GearIcon } from './icons'

interface OrdersRequestsJackpotProps {
  items: OrderRequestItem[]
  onResult: (id: string, correct: boolean) => void
  onOpenConfig: () => void
}

/**
 * Sección «Orders & Requests»: se saca una carta boca abajo y, al darla vuelta,
 * aparece la orden/petición directa con su introductor para transformar a
 * Reported Speech.
 */
const OrdersRequestsJackpot = ({ items, onResult, onOpenConfig }: OrdersRequestsJackpotProps) => {
  const [combo, setCombo] = useState<OrderRequestItem>(() => weightedPick(items))
  const [flipped, setFlipped] = useState(false)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<OrderRequestValidationResult | null>(null)
  const [showAnswers, setShowAnswers] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLButtonElement>(null)
  const drawRef = useRef<HTMLButtonElement>(null)

  const stillValid = items.some((p) => p.id === combo.id)
  if (!stillValid && items.length > 0) setCombo(weightedPick(items))

  // Al dar vuelta la carta, llevar el foco al cuadro de texto.
  useEffect(() => {
    if (flipped) inputRef.current?.focus()
  }, [flipped])

  const flip = useCallback(() => setFlipped((v) => !v), [])

  /** Saca una carta nueva (sin repetir la anterior), boca abajo. */
  const drawCard = useCallback(() => {
    if (items.length === 0) return
    const pool = items.length > 1 ? items.filter((p) => p.id !== combo.id) : items
    setCombo(weightedPick(pool))
    setFlipped(false)
    setAnswer('')
    setResult(null)
    setShowAnswers(false)
    // Foco en la carta nueva: Enter la voltea y el foco pasa al input.
    requestAnimationFrame(() => cardRef.current?.focus())
  }, [items, combo.id])

  const check = useCallback(() => {
    if (answer.trim().length === 0) return
    const outcome = validateOrderAnswer(answer, combo)
    setResult(outcome)
    setAttempt((n) => n + 1)
    setShowAnswers(false)
    onResult(combo.id, outcome.isValid)
    // Correcta → foco en «Sacar otra carta»; incorrecta → vuelve al input.
    requestAnimationFrame(() => {
      if (outcome.isValid) drawRef.current?.focus()
      else inputRef.current?.focus()
    })
  }, [answer, combo, onResult])

  const canValidate = flipped && answer.trim().length > 0
  const accepted = acceptedVariants(combo)

  return (
    <div className="panel relative mt-6 overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-gold-gradient text-lg font-extrabold uppercase">
            Orders &amp; Requests
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Sacá una carta y transformá la orden o petición directa a Reported Speech. Las frases
            que más fallás reaparecen más seguido.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenConfig}
          aria-label="Configuración de Orders & Requests"
          title="Configuración de Orders & Requests"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-night-900/70 text-slate-300 transition hover:border-gold-400/50 hover:text-gold-300"
        >
          <GearIcon className="size-5" />
        </button>
      </div>

      {/* Mesa: mazo de cartas */}
      <div className="felt mx-auto mt-5 w-full max-w-[22rem] px-4 pt-8 pb-6">
        <div className="relative mx-auto w-full max-w-[17rem]">
          <span
            aria-hidden="true"
            className="absolute inset-0 -translate-y-3 scale-[0.96] rounded-3xl border-[3px] border-white/55 bg-[#540915]/80"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 -translate-y-1.5 scale-[0.98] rounded-3xl border-[3px] border-white/70 bg-[#7c0f20]/85"
          />

          <div key={combo.id} className="animate-deal relative">
            <PlayingCard
              flipped={flipped}
              onFlip={flip}
              label="Carta de Orders & Requests"
              suit="♥"
              buttonRef={cardRef}
            >
              <span className="flex h-full flex-col">
                <span className="flex items-center justify-between px-5 pt-5">
                  <span className="rounded-full bg-[#b3122b] px-3 py-1 text-[0.6rem] font-bold tracking-[0.16em] text-white uppercase">
                    {combo.category}
                  </span>
                  <span className="font-display text-[0.62rem] font-bold tracking-[0.18em] text-night-800/50 uppercase">
                    Orders &amp; Requests
                  </span>
                </span>
                <span className="flex flex-1 flex-col items-center justify-center gap-2.5 px-6 text-center">
                  <span className="text-[0.62rem] font-bold tracking-[0.22em] text-night-800/55 uppercase">
                    Transformá a Reported Speech
                  </span>
                  <span className="font-display text-lg leading-snug font-bold text-night-900">
                    “{combo.directSentence}”
                  </span>
                  <span className="mt-1 rounded-xl bg-night-950/5 px-3 py-1.5 text-sm text-night-800">
                    <span className="text-[0.58rem] font-bold tracking-[0.2em] text-night-800/50 uppercase">
                      Intro ·{' '}
                    </span>
                    <span className="font-semibold">{combo.introContext}</span>
                  </span>
                </span>
                <span className="px-5 pb-5 text-center text-[0.62rem] font-medium text-night-800/50">
                  Escribí la transformación abajo
                </span>
              </span>
            </PlayingCard>
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={drawCard}
            ref={drawRef}
            className="font-display group inline-flex items-center gap-3 rounded-2xl border border-gold-400/40 bg-night-950/40 px-6 py-3 text-sm font-extrabold tracking-[0.12em] text-gold-200 uppercase transition hover:border-gold-300/70 hover:bg-night-950/60 hover:text-gold-100 active:translate-y-px"
          >
            <CardsIcon className="size-5 transition group-hover:-rotate-6" />
            Sacar otra carta
          </button>
        </div>
      </div>

      {/* Respuesta */}
      <div className="mt-6">
        <label className="block text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
          Tu transformación en Reported Speech
        </label>
        <p className="mt-1 text-xs text-slate-500">
          {flipped ? (
            <>
              Podés escribir la oración completa ({combo.introContext}) o solo la cláusula
              transformada. Tipo: <span className="text-grape-400">{combo.category}</span>
            </>
          ) : (
            'Dale vuelta a la carta para ver la orden o petición.'
          )}
        </p>
        <div className="mt-2">
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
            placeholder={flipped ? 'p. ej. to send him the report before lunch' : 'Primero girá la carta'}
            disabled={!flipped}
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
          {flipped && (
            <button
              type="button"
              onClick={() => setShowAnswers((v) => !v)}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-gold-400/50 hover:text-gold-300"
            >
              {showAnswers ? 'Ocultar respuestas' : 'Ver respuestas'}
            </button>
          )}
          <span className="text-xs text-slate-500">
            Peso/dificultad: <span className="font-mono text-gold-300">{combo.difficultyWeight}</span>
          </span>
        </div>

        {showAnswers && (
          <ul className="mt-3 space-y-1 rounded-xl border border-white/10 bg-night-900/60 px-4 py-3 text-sm text-night-200">
            {accepted.map((variant, i) => (
              <li key={i} className="font-mono">
                • {variant}
              </li>
            ))}
          </ul>
        )}

        {result && <OrdersRequestsFeedback result={result} nonce={attempt} />}
      </div>
    </div>
  )
}

export default OrdersRequestsJackpot
