import { useCallback, useEffect, useRef, useState } from 'react'
import type { LinkingRound, LinkingSelectionResult, LinkingWordItem } from '../lib/linkingWords'
import { buildRound, evaluateLinkingSelection, weightedPick } from '../lib/linkingWords'
import { normalizeAnswerText } from '../lib/answerText'
import { Reel } from './Reel'
import { LinkingWordsFeedback } from './LinkingWordsFeedback'
import { AlertIcon, CheckIcon, DiceIcon, GearIcon } from './icons'

const REEL_DURATION_MS = 1150
const REEL_STAGGER_MS = 180
const TOTAL_SPIN_MS = REEL_STAGGER_MS * 2 + REEL_DURATION_MS + 200

interface LinkingWordsJackpotProps {
  items: LinkingWordItem[]
  onResult: (id: string, correct: boolean) => void
  onOpenConfig: () => void
}

/**
 * Sección «Linking Words»: dos rodillos fijan la Idea A y la relación; la Idea B
 * se muestra como contexto. El tercer rodillo es un selector múltiple con el
 * conector correcto y tres distractores de otras relaciones.
 */
const LinkingWordsJackpot = ({ items, onResult, onOpenConfig }: LinkingWordsJackpotProps) => {
  const [roundState, setRoundState] = useState<{ combo: LinkingWordItem; round: LinkingRound }>(
    () => {
      const first = weightedPick(items)
      return { combo: first, round: buildRound(first, items) }
    },
  )
  const { combo, round } = roundState
  const [pending, setPending] = useState<LinkingWordItem | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [spinToken, setSpinToken] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<LinkingSelectionResult | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [hasSpun, setHasSpun] = useState(false)

  const timer = useRef<number | null>(null)
  const spinRef = useRef<HTMLButtonElement>(null)
  const firstOptionRef = useRef<HTMLButtonElement>(null)

  // Si la config cambia y el combo ya no existe, se recalcula durante el render.
  const stillValid = items.some((p) => p.id === combo.id)
  if (!stillValid && items.length > 0) {
    const next = weightedPick(items)
    setRoundState({ combo: next, round: buildRound(next, items) })
  }

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  // Al terminar el giro, el foco va a la primera opción del selector.
  useEffect(() => {
    if (!hasSpun || spinning) return
    requestAnimationFrame(() => firstOptionRef.current?.focus())
  }, [hasSpun, spinning])

  const spin = useCallback(() => {
    if (timer.current !== null || items.length === 0) return
    const next = weightedPick(items)
    setPending(next)
    setSpinning(true)
    setSpinToken((n) => n + 1)
    setSelected(null)
    setResult(null)
    setHasSpun(true)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setSpinning(false)
      setRoundState({ combo: next, round: buildRound(next, items) })
      setPending(null)
    }, TOTAL_SPIN_MS)
  }, [items])

  const choose = useCallback(
    (option: string) => {
      if (spinning || selected !== null) return
      const outcome = evaluateLinkingSelection(option, combo, round.correct)
      setSelected(option)
      setResult(outcome)
      setAttempt((n) => n + 1)
      onResult(combo.id, outcome.isCorrect)
      // Tras responder, el foco vuelve a «Girar» para seguir con el teclado.
      requestAnimationFrame(() => spinRef.current?.focus())
    },
    [spinning, selected, combo, round.correct, onResult],
  )

  const next = pending ?? combo
  const ideaAItems = items.map((p) => p.ideaA)
  const ideaBItems = items.map((p) => p.ideaB)
  const relationItems = Array.from(new Set(items.map((p) => p.relationLabel)))
  const options = round.options
  const correct = round.correct
  const answered = result !== null

  return (
    <div className="panel relative mt-6 overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-gold-gradient text-lg font-extrabold uppercase">
            Linking Words
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Girá los rodillos y elegí el conector que une las dos ideas. Las combinaciones que más
            fallás reaparecen más seguido.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenConfig}
          aria-label="Configuración de Linking Words"
          title="Configuración de Linking Words"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-night-900/70 text-slate-300 transition hover:border-gold-400/50 hover:text-gold-300"
        >
          <GearIcon className="size-5" />
        </button>
      </div>

      {/* Rodillos 1, 2 y 3 */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Reel
          index={1}
          title="Idea A"
          items={ideaAItems}
          current={combo.ideaA}
          target={next.ideaA}
          spinning={spinning}
          spinToken={spinToken}
          delay={0}
          accentClass="border-gold-400/40"
        />
        <Reel
          index={2}
          title="Relación"
          items={relationItems}
          current={combo.relationLabel}
          target={next.relationLabel}
          spinning={spinning}
          spinToken={spinToken}
          delay={REEL_STAGGER_MS}
          accentClass="border-grape-500/40"
        />
        <Reel
          index={3}
          title="Idea B"
          items={ideaBItems}
          current={combo.ideaB}
          target={next.ideaB}
          spinning={spinning}
          spinToken={spinToken}
          delay={REEL_STAGGER_MS * 2}
          accentClass="border-candy-400/40"
        />
      </div>

      {/* Girar */}
      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={spin}
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
              Girar
            </>
          )}
        </button>
      </div>

      {/* Rodillo 3: selector de conector */}
      <section className="mt-5 rounded-2xl border border-white/10 bg-night-950/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.65rem] font-bold tracking-[0.18em] text-slate-400 uppercase">
            Conector
          </p>
          <p className="text-xs text-slate-500">Elegí la opción correcta</p>
        </div>

        {spinning ? (
          <p className="mt-4 text-center text-sm text-slate-500">Girando…</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((option, index) => {
              const isCorrectOption = normalizeAnswerText(option) === normalizeAnswerText(correct)
              const isChosen = selected === option

              let tone =
                'border-white/15 bg-night-900/60 text-slate-200 hover:border-gold-400/50 hover:text-gold-200'
              if (answered) {
                if (isCorrectOption) {
                  tone = 'border-neon-400/60 bg-neon-500/15 text-neon-200'
                } else if (isChosen) {
                  tone = 'border-candy-400/60 bg-candy-500/15 text-candy-200'
                } else {
                  tone = 'border-white/10 bg-night-900/40 text-slate-500'
                }
              }

              return (
                <button
                  key={option}
                  type="button"
                  ref={index === 0 ? firstOptionRef : undefined}
                  onClick={() => choose(option)}
                  disabled={spinning || selected !== null}
                  aria-pressed={isChosen}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-default ${tone}`}
                >
                  <span className="font-mono">{option}</span>
                  {answered && isCorrectOption && <CheckIcon className="size-4 shrink-0" />}
                  {answered && isChosen && !isCorrectOption && (
                    <AlertIcon className="size-4 shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {result && <LinkingWordsFeedback result={result} nonce={attempt} />}
    </div>
  )
}

export default LinkingWordsJackpot
