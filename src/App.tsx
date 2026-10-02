import { useCallback, useEffect, useMemo, useState } from 'react'
import { TENSE_INFO } from './lib/grammar'
import { useReelsData } from './hooks/useReelsData'
import { useSlotMachine } from './hooks/useSlotMachine'
import { buildExample, validate, type ValidationResult } from './lib/validator'
import { AnswerPanel } from './components/AnswerPanel'
import { ConfigModal } from './components/ConfigModal'
import { Reel } from './components/Reel'
import { DiceIcon, GearIcon, TrophyIcon } from './components/icons'

/* -------------------------------------------------------------------------- */
/*                         Bloque de ayuda del Reel 4                          */
/* -------------------------------------------------------------------------- */

function MomentHint({ label, hint, tense, constraint }: {
  label: string
  hint?: string
  tense: string
  constraint: string | null
}) {
  const info = TENSE_INFO[tense as keyof typeof TENSE_INFO]
  return (
    <div className="mt-5 rounded-2xl border border-grape-500/25 bg-grape-500/10 px-4 py-3">
      <p className="text-[0.65rem] font-bold tracking-[0.18em] text-grape-400 uppercase">
        {label}
        {info ? ` · ${info.name}` : ''}
      </p>
      {info && <p className="mt-1 font-mono text-xs text-grape-400/90">{info.formula}</p>}
      {hint && <p className="mt-2 text-sm leading-relaxed text-slate-300">{hint}</p>}
      {constraint && (
        <p className="mt-2 text-sm text-gold-200">
          Conector obligatorio: <span className="font-mono font-bold">{constraint}</span>
        </p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export default function App() {
  const { data, isCustom, storageAvailable, setData, replaceAll, resetToDefault } = useReelsData()
  const { combo, reels, spinning, spinToken, spin } = useSlotMachine(data)

  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [showExample, setShowExample] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [solved, setSolved] = useState(0)
  const [misses, setMisses] = useState(0)

  const check = useCallback(() => {
    const outcome = validate(answer, combo, data.subjects)
    setResult(outcome)
    setAttempt((n) => n + 1)
    setShowExample(false)
    setSolved((n) => (outcome.valid ? n + 1 : n))
    setMisses((n) => (outcome.valid ? n : n + 1))
  }, [answer, combo, data.subjects])

  /* Tirar limpia el intento anterior: se hace aquí y no en un efecto para
     evitar un render intermedio con datos viejos. */
  const spinAndReset = useCallback(() => {
    setResult(null)
    setAnswer('')
    setShowExample(false)
    spin()
  }, [spin])

  /* Atajo de teclado: espacio = tirar, Enter = comprobar. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      if (event.code === 'Space' && !typing) {
        event.preventDefault()
        if (!spinning) spinAndReset()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [spinAndReset, spinning])

  /* Estable para que el modal de configuración no registre sus listeners
     de teclado en cada render mientras editas los rodillos. */
  const closeConfig = useCallback(() => setConfigOpen(false), [])

  const placeholder = useMemo(() => {
    const verb = combo.verb.verb.toLowerCase()
    return `Ej.: ${combo.subject} ... ${verb} ...`
  }, [combo])

  const tenseInfo = TENSE_INFO[combo.moment.tense]
  const total = solved + misses
  const example = useMemo(() => buildExample(combo), [combo])

  return (
    <div className="min-h-dvh px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        {/* Cabecera */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.3em] text-gold-400/80 uppercase">
              <span className="inline-block size-1.5 rounded-full bg-gold-400" /> English Jackpot
            </p>
            <h1 className="font-display text-gold-gradient mt-1 text-3xl leading-none font-extrabold sm:text-4xl">
              SLOT MACHINE
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Tira los rodillos, construye la oración correcta en inglés y demuestra el{' '}
              <span className="text-gold-300">{tenseInfo?.name ?? 'tiempo verbal'}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-night-900/70 px-3 py-2">
              <TrophyIcon className="size-4 text-gold-400" />
              <span className="font-display text-sm font-bold text-gold-200 tabular-nums">{solved}</span>
              <span className="text-xs text-slate-500">/ {total}</span>
            </div>
            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              title="Configuración / Editor JSON"
              aria-label="Abrir configuración"
              className="grid size-11 place-items-center rounded-xl border border-white/10 bg-night-900/70 text-slate-300 transition hover:border-gold-400/50 hover:text-gold-300"
            >
              <GearIcon className="size-5" />
            </button>
          </div>
        </header>

        {/* Máquina */}
        <main className="panel relative mt-6 overflow-hidden p-4 sm:p-6">
          {/* Luces del marco */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Reel
              index={1}
              title="Subject"
              items={reels.subject.items}
              current={reels.subject.value}
              target={reels.subject.target}
              spinning={spinning}
              spinToken={spinToken}
              delay={reels.subject.delay}
              accentClass="border-grape-500/40"
            />
            <Reel
              index={2}
              title="Verb + Object"
              items={reels.verb.items}
              current={reels.verb.value}
              target={reels.verb.target}
              spinning={spinning}
              spinToken={spinToken}
              delay={reels.verb.delay}
              accentClass="border-candy-400/40"
            />
            <Reel
              index={3}
              title="Sentence type"
              items={reels.sentenceType.items}
              current={reels.sentenceType.value}
              target={reels.sentenceType.target}
              spinning={spinning}
              spinToken={spinToken}
              delay={reels.sentenceType.delay}
              accentClass="border-neon-400/40"
            />
            <Reel
              index={4}
              title="Moment"
              items={reels.moment.items}
              current={reels.moment.value}
              target={reels.moment.target}
              spinning={spinning}
              spinToken={spinToken}
              delay={reels.moment.delay}
              accentClass="border-gold-400/40"
            />
          </div>

          <MomentHint
            label={combo.moment.label}
            hint={combo.moment.hint}
            tense={combo.moment.tense}
            constraint={combo.moment.requiredTimeConstraint ?? null}
          />

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={spinAndReset}
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
        </main>

        <AnswerPanel
          answer={answer}
          onAnswerChange={setAnswer}
          onSubmit={check}
          disabled={spinning}
          result={result}
          attempt={attempt}
          showExample={showExample}
          onToggleExample={() => setShowExample((v) => !v)}
          placeholder={placeholder}
          example={example}
        />

        {/* Pie */}
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Atajo: <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">Espacio</kbd> para
            tirar · <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">Enter</kbd> para
            comprobar
          </p>
          {isCustom && <p className="text-gold-400/80">Configuración personalizada guardada en este navegador.</p>}
        </footer>
      </div>

      <ConfigModal
        open={configOpen}
        onClose={closeConfig}
        data={data}
        onChange={setData}
        onReplaceAll={replaceAll}
        onReset={resetToDefault}
        isCustom={isCustom}
        storageAvailable={storageAvailable}
      />
    </div>
  )
}