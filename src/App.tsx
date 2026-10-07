import { useCallback, useEffect, useMemo, useState } from 'react'
import { TENSE_INFO } from './lib/grammar'
import { useReelsData } from './hooks/useReelsData'
import { useConditionalsData } from './hooks/useConditionalsData'
import { useSlotMachine } from './hooks/useSlotMachine'
import { buildExample, validate, type ValidationResult } from './lib/validator'
import { validateReportedSpeech } from './lib/reportedSpeech'
import { AnswerPanel } from './components/AnswerPanel'
import { ConfigModal } from './components/ConfigModal'
import { Reel } from './components/Reel'
import { DiceIcon, GearIcon, TrophyIcon } from './components/icons'
import ConditionalJackpot from './components/ConditionalJackpot'
import { ConditionalsConfigModal } from './components/ConditionalsConfigModal'
import WorkplaceChat from './components/WorkplaceChat'
import { WorkplaceChatConfigModal } from './components/WorkplaceChatConfigModal'
import { useWorkplaceChat } from './hooks/useWorkplaceChat'
import { nextWeight } from './lib/workplaceChat'
import PhrasalVerbs from './components/PhrasalVerbs'
import { PhrasalVerbsConfigModal } from './components/PhrasalVerbsConfigModal'
import { usePhrasalVerbs } from './hooks/usePhrasalVerbs'
import { nextWeight as nextPhrasalWeight } from './lib/phrasalVerbs'
import VocabularyJackpot from './components/VocabularyJackpot'
import { VocabularyConfigModal } from './components/VocabularyConfigModal'
import { useVocabulary } from './hooks/useVocabulary'
import { nextWeight as nextVocabWeight } from './lib/vocabulary'

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
  const {
    data: condData,
    isCustom: condIsCustom,
    storageAvailable: condStorageAvailable,
    setData: setCondData,
    replaceAll: replaceCondAll,
    resetToDefault: resetCondDefault,
  } = useConditionalsData()
  const {
    phrases: chatPhrases,
    isCustom: chatIsCustom,
    storageAvailable: chatStorageAvailable,
    updatePhrases: updateChatPhrases,
    replaceAll: replaceChatAll,
    resetStats: resetChatStats,
    resetToDefault: resetChatDefault,
  } = useWorkplaceChat()
  const {
    items: phrasalItems,
    isCustom: phrasalIsCustom,
    storageAvailable: phrasalStorageAvailable,
    updateItems: updatePhrasalItems,
    replaceAll: replacePhrasalAll,
    resetStats: resetPhrasalStats,
    resetToDefault: resetPhrasalDefault,
  } = usePhrasalVerbs()
  const {
    items: vocabItems,
    isCustom: vocabIsCustom,
    storageAvailable: vocabStorageAvailable,
    updateItems: updateVocabItems,
    replaceAll: replaceVocabAll,
    resetStats: resetVocabStats,
    resetToDefault: resetVocabDefault,
  } = useVocabulary()
  const { combo, reels, spinning, spinToken, spin } = useSlotMachine(data)

  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [showExample, setShowExample] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [condConfigOpen, setCondConfigOpen] = useState(false)
  const [chatConfigOpen, setChatConfigOpen] = useState(false)
  const [phrasalConfigOpen, setPhrasalConfigOpen] = useState(false)
  const [vocabConfigOpen, setVocabConfigOpen] = useState(false)
  const [solved, setSolved] = useState(0)
  const [misses, setMisses] = useState(0)
  const [isPrimaryValid, setIsPrimaryValid] = useState(false)
  const [currentView, setCurrentView] = useState('jackpot')
  const [reportedSpeechInput, setReportedSpeechInput] = useState('')
  const [_isReportedValid, setIsReportedValid] = useState<boolean | null>(null)
  const [_reportedFeedbackMessage, setReportedFeedbackMessage] = useState('')

  // Contador global: lo alimentan todas las secciones.
  const recordResult = useCallback((correct: boolean) => {
    setSolved((n) => (correct ? n + 1 : n))
    setMisses((n) => (correct ? n : n + 1))
  }, [])

  const check = useCallback(() => {
    const outcome = validate(answer, combo, data.subjects)
    setResult(outcome)
    setAttempt((n) => n + 1)
    setShowExample(false)
    // Si la respuesta es correcta, desbloquea el Paso 2: Reported Speech
    if (outcome.valid) {
      setIsPrimaryValid(true)
    }
    recordResult(outcome.valid)
  }, [answer, combo, data.subjects, recordResult])
  const validateReportedSpeechHandler = useCallback(() => {
    if (!isPrimaryValid) return
    const outcome = validateReportedSpeech(reportedSpeechInput, combo)
    setIsReportedValid(outcome.valid)
    setReportedFeedbackMessage(outcome.valid ? 'Correcto' : (outcome.errors[0]?.message || 'Error'))
  }, [reportedSpeechInput, isPrimaryValid, combo])



  /* Tirar limpia el intento anterior: se hace aquí y no en un efecto para
     evitar un render intermedio con datos viejos. */
  const spinAndReset = useCallback(() => {
    setResult(null)
    setAnswer('')
    setShowExample(false)
    setIsPrimaryValid(false)
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
  
  // Sincronizar reportedSpeechInput cuando isPrimaryValid cambia
  useEffect(() => {
    if (isPrimaryValid && reportedSpeechInput.trim().length === 0) {
      setReportedSpeechInput('Maria said that ')
    }
  }, [isPrimaryValid, reportedSpeechInput])



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

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <button
            type="button"
            onClick={() => setCurrentView('jackpot')}
            className={currentView === 'jackpot' ? 'bg-gold-300 text-night-950 px-4 py-2 rounded-md hover:text-night-950 hover:bg-gold-200 transition' : 'text-slate-300 hover:text-gold-300 px-4 py-2 rounded-md transition'}
          >
            Jackpot Gramatical
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('conditionals')}
            className={currentView === 'conditionals' ? 'bg-gold-300 text-night-950 px-4 py-2 rounded-md hover:text-night-950 hover:bg-gold-200 transition' : 'text-slate-300 hover:text-gold-300 px-4 py-2 rounded-md transition'}
          >
            Conditionals Jackpot
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('workplace')}
            className={currentView === 'workplace' ? 'bg-gold-300 text-night-950 px-4 py-2 rounded-md hover:text-night-950 hover:bg-gold-200 transition' : 'text-slate-300 hover:text-gold-300 px-4 py-2 rounded-md transition'}
          >
            Workplace Chat
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('phrasal')}
            className={currentView === 'phrasal' ? 'bg-gold-300 text-night-950 px-4 py-2 rounded-md hover:text-night-950 hover:bg-gold-200 transition' : 'text-slate-300 hover:text-gold-300 px-4 py-2 rounded-md transition'}
          >
            Phrasal Verbs
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('vocabulary')}
            className={currentView === 'vocabulary' ? 'bg-gold-300 text-night-950 px-4 py-2 rounded-md hover:text-night-950 hover:bg-gold-200 transition' : 'text-slate-300 hover:text-gold-300 px-4 py-2 rounded-md transition'}
          >
            Vocabulary
          </button>
        </div>

        {currentView === 'conditionals' && (
          <ConditionalJackpot
            data={condData}
            onOpenConfig={() => setCondConfigOpen(true)}
            onResult={recordResult}
          />
        )}

        {currentView === 'workplace' && (
          <WorkplaceChat
            phrases={chatPhrases}
            onResult={(id, correct) => {
              updateChatPhrases((list) =>
                list.map((p) =>
                  p.id === id ? { ...p, difficultyWeight: nextWeight(p.difficultyWeight, correct) } : p,
                ),
              )
              recordResult(correct)
            }}
            onOpenConfig={() => setChatConfigOpen(true)}
          />
        )}

        {currentView === 'phrasal' && (
          <PhrasalVerbs
            items={phrasalItems}
            onResult={(id, correct) => {
              updatePhrasalItems((list) =>
                list.map((p) =>
                  p.id === id ? { ...p, difficultyWeight: nextPhrasalWeight(p.difficultyWeight, correct) } : p,
                ),
              )
              recordResult(correct)
            }}
            onOpenConfig={() => setPhrasalConfigOpen(true)}
          />
        )}

        {currentView === 'vocabulary' && (
          <VocabularyJackpot
            items={vocabItems}
            onResult={(id, correct) => {
              updateVocabItems((list) =>
                list.map((p) =>
                  p.id === id ? { ...p, difficultyWeight: nextVocabWeight(p.difficultyWeight, correct) } : p,
                ),
              )
              recordResult(correct)
            }}
            onOpenConfig={() => setVocabConfigOpen(true)}
          />
        )}

        {currentView === 'jackpot' && (
        <>
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
        

        {/* Reported Speech Step - appears after primary validation */}
        {isPrimaryValid && (
          <div className="panel relative mt-6 overflow-hidden p-4 sm:p-6 bg-gold-500/20">
            <h3 className="font-display text-gold-gradient text-sm font-bold uppercase mb-4">
              Paso 2: Reported Speech
            </h3>
            <p className="text-sm text-slate-400 mb-3">
              Imagina que <strong>Maria</strong> dijo esta oración. Transforma a Reported Speech
              comenzando por <code>"Maria said that"\</code>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
              <label className="text-xs text-slate-500 uppercase mb-1">
                Tu respuesta:
              </label>
              <input
                className="field w-full sm:w-auto"
                value={reportedSpeechInput}
                onChange={(e) => setReportedSpeechInput(e.target.value)}
                placeholder="Maria said that..."
                disabled={spinning}
              />
            </div>
            <button
              type="button"
              onClick={validateReportedSpeechHandler}
              disabled={spinning || !reportedSpeechInput.startsWith('Maria said that')}
              className="w-full sm:w-auto rounded-2xl px-4 py-2 text-sm font-medium text-night-950 bg-gradient-to-b from-gold-300 via-gold-400 to-gold-600 hover:from-gold-200 hover:via-gold-300 hover:to-gold-500 transition">
              Validar Reported Speech
            </button>
            {/* Mostrar feedback de Reported Speech */}
            {_isReportedValid !== null && (
              <p className="text-sm mt-3 flex items-center gap-2">
                {_isReportedValid
                  ? <span className="text-gold-400">
                      <svg className="w-3.5 h-3.5 fill-current text-gold-400" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M9.06 13.54a.75.75 0 01-.08-.03L3.18 6.22a.75.75 0 01-.02-.95l1.36-1.36a.75.75 0 011.06.08L9.06 13.54zM.75 5.75a.75.75 0 01.75-.75h11.25a.75.75 0 01.75.75v9.5a.75.75 0 01-.75.75H2.25a.75.75 0 01-.75-.75V5.75zM1.5 10.75a.75.75 0 01.75-.75h7.5a.75.75 0 01.75.75v3.75a.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75v-3.75zM9.75 15.75a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v2.25a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-2.25z"/>
                      </svg>
                      ¡Correcto!
                    </span>
                  : <span className="text-red-400">
                      <svg className="w-3.5 h-3.5 fill-current text-red-400" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.71 6.53a.75.75 0 00-1.06 1.03L5.05 12.91 1.41 9.39a.75.75 0 00-.53 1.08l3.7 3.7a.75.75 0 001.08-.52l5.17-5.17a.75.75 0 00-.52-1.06L8.71 6.53z"/>
                      </svg>
                      ¡Error!
                    </span>}
                {_reportedFeedbackMessage && (!_isReportedValid ? ` — ${_reportedFeedbackMessage}` : '')}
              </p>
            )}
          </div>
        )}

<footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Atajo: <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">Espacio</kbd> para
            tirar · <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">Enter</kbd> para
            comprobar
          </p>
          {isCustom && <p className="text-gold-400/80">Configuración personalizada guardada en este navegador.</p>}
        </footer>
        </>
        )}
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

      <ConditionalsConfigModal
        open={condConfigOpen}
        onClose={() => setCondConfigOpen(false)}
        data={condData}
        onChange={setCondData}
        onReplaceAll={replaceCondAll}
        onReset={resetCondDefault}
        isCustom={condIsCustom}
        storageAvailable={condStorageAvailable}
      />

      <WorkplaceChatConfigModal
        open={chatConfigOpen}
        onClose={() => setChatConfigOpen(false)}
        phrases={chatPhrases}
        onChange={updateChatPhrases}
        onReplaceAll={replaceChatAll}
        onResetStats={resetChatStats}
        onResetDefault={resetChatDefault}
        isCustom={chatIsCustom}
        storageAvailable={chatStorageAvailable}
      />

      <PhrasalVerbsConfigModal
        open={phrasalConfigOpen}
        onClose={() => setPhrasalConfigOpen(false)}
        items={phrasalItems}
        onChange={updatePhrasalItems}
        onReplaceAll={replacePhrasalAll}
        onResetStats={resetPhrasalStats}
        onResetDefault={resetPhrasalDefault}
        isCustom={phrasalIsCustom}
        storageAvailable={phrasalStorageAvailable}
      />

      <VocabularyConfigModal
        open={vocabConfigOpen}
        onClose={() => setVocabConfigOpen(false)}
        items={vocabItems}
        onChange={updateVocabItems}
        onReplaceAll={replaceVocabAll}
        onResetStats={resetVocabStats}
        onResetDefault={resetVocabDefault}
        isCustom={vocabIsCustom}
        storageAvailable={vocabStorageAvailable}
      />
    </div>
  )
}