import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatPhrase, ChatValidationResult } from '../lib/workplaceChat'
import { CHAT_CATEGORIES, validateChatAnswer, weightedPick } from '../lib/workplaceChat'
import { Reel } from './Reel'
import { WorkplaceChatFeedback } from './WorkplaceChatFeedback'
import { DiceIcon, GearIcon } from './icons'

const REEL_DURATION_MS = 1150
const REEL_STAGGER_MS = 180
const TOTAL_SPIN_MS = REEL_STAGGER_MS + REEL_DURATION_MS + 200

interface WorkplaceChatProps {
  phrases: ChatPhrase[]
  onResult: (id: string, correct: boolean) => void
  onOpenConfig: () => void
}

/**
 * Sección «Workplace Chat»: un tragamonedas que propone una frase en español
 * (con su tono) y el usuario escribe cómo decirlo en inglés.
 */
const WorkplaceChat = ({ phrases, onResult, onOpenConfig }: WorkplaceChatProps) => {
  const [combo, setCombo] = useState<ChatPhrase>(() => weightedPick(phrases))
  const [pending, setPending] = useState<ChatPhrase | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [spinToken, setSpinToken] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<ChatValidationResult | null>(null)
  const [showVariants, setShowVariants] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [hasSpun, setHasSpun] = useState(false)

  const timer = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Si la config cambia y el combo ya no existe, se recalcula durante el render.
  const stillValid = phrases.some((p) => p.id === combo.id)
  if (!stillValid && phrases.length > 0) setCombo(weightedPick(phrases))

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  // Al terminar la tirada, llevar el foco al cuadro de texto.
  useEffect(() => {
    if (hasSpun && !spinning) inputRef.current?.focus()
  }, [hasSpun, spinning])

  const spin = useCallback(() => {
    if (timer.current !== null || phrases.length === 0) return
    const next = weightedPick(phrases)
    setPending(next)
    setSpinning(true)
    setSpinToken((n) => n + 1)
    setResult(null)
    setShowVariants(false)
    setAnswer('')
    setHasSpun(true)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setSpinning(false)
      setCombo(next)
      setPending(null)
    }, TOTAL_SPIN_MS)
  }, [phrases])

  const check = useCallback(() => {
    if (answer.trim().length === 0) return
    const outcome = validateChatAnswer(answer, combo)
    setResult(outcome)
    setAttempt((n) => n + 1)
    setShowVariants(false)
    onResult(combo.id, outcome.isValid)
  }, [answer, combo, onResult])

  const next = pending ?? combo
  const phraseItems = phrases.map((p) => p.spanish)
  const categoryItems = Array.from(new Set([...phrases.map((p) => p.category), ...CHAT_CATEGORIES]))
  const canValidate = !spinning && answer.trim().length > 0

  return (
    <div className="panel relative mt-6 overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-gold-gradient text-lg font-extrabold uppercase">
            Workplace Chat
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Traduce al inglés como lo dirías en Slack, Teams o un email. Las frases que más
            fallás reaparecen más seguido.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenConfig}
          aria-label="Configuración de frases"
          title="Configuración de frases"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-night-900/70 text-slate-300 transition hover:border-gold-400/50 hover:text-gold-300"
        >
          <GearIcon className="size-5" />
        </button>
      </div>

      {/* Máquina: frase (ES) + tono */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="sm:col-span-2">
          <Reel
            index={1}
            title="Frase en español"
            items={phraseItems}
            current={combo.spanish}
            target={next.spanish}
            spinning={spinning}
            spinToken={spinToken}
            delay={0}
            accentClass="border-gold-400/40"
          />
        </div>
        <Reel
          index={2}
          title="Tono / contexto"
          items={categoryItems}
          current={combo.category}
          target={next.category}
          spinning={spinning}
          spinToken={spinToken}
          delay={REEL_STAGGER_MS}
          accentClass="border-grape-500/40"
        />
      </div>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={spin}
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
          Tu respuesta en inglés
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Tono: <span className="text-grape-400">{combo.category}</span>
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
            placeholder="Escribe cómo lo dirías…"
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
            onClick={() => setShowVariants((v) => !v)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-gold-400/50 hover:text-gold-300"
          >
            {showVariants ? 'Ocultar respuestas' : 'Ver respuestas'}
          </button>
          <span className="text-xs text-slate-500">
            Peso/dificultad: <span className="font-mono text-gold-300">{combo.difficultyWeight}</span>
          </span>
        </div>

        {showVariants && (
          <ul className="mt-3 space-y-1 rounded-xl border border-white/10 bg-night-900/60 px-4 py-3 text-sm text-night-200">
            {combo.englishVariants.map((variant, i) => (
              <li key={i} className="font-mono">
                • {variant}
              </li>
            ))}
          </ul>
        )}

        {result && <WorkplaceChatFeedback result={result} nonce={attempt} />}
      </div>
    </div>
  )
}

export default WorkplaceChat
