import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConditionalData } from '../lib/conditionals'
import { downloadJsonFile, readJsonFile } from '../lib/storage'
import {
  sanitizeConditionalData,
  validateConditionalSchema,
} from '../lib/conditionalsStorage'
import { CloseIcon, DownloadIcon, ResetIcon, UploadIcon } from './icons'
import { ConditionalsEditor, type ConditionalsSection } from './config/ConditionalsEditors'
import { RawConditionalsJsonEditor } from './config/RawConditionalsJsonEditor'

interface ConditionalsConfigModalProps {
  open: boolean
  onClose: () => void
  data: ConditionalData
  onChange: (updater: (current: ConditionalData) => ConditionalData) => void
  onReplaceAll: (data: ConditionalData) => void
  onReset: () => void
  isCustom: boolean
  storageAvailable: boolean
}

type Tab = ConditionalsSection | 'json'

const TABS: { id: Tab; label: string }[] = [
  { id: 'usages', label: 'Usos' },
  { id: 'subjects', label: 'Sujetos' },
  { id: 'conditions', label: 'Condiciones' },
  { id: 'results', label: 'Resultados' },
  { id: 'polarities', label: 'Polaridades' },
  { id: 'json', label: 'JSON' },
]

export function ConditionalsConfigModal({
  open,
  onClose,
  data,
  onChange,
  onReplaceAll,
  onReset,
  isCustom,
  storageAvailable,
}: ConditionalsConfigModalProps) {
  const [tab, setTab] = useState<Tab>('usages')
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const close = useCallback(() => {
    setStatus(null)
    onCloseRef.current()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [close, open])

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const parsed = await readJsonFile(file)
        const report = validateConditionalSchema(parsed)
        if (!report.ok) {
          setStatus({ tone: 'error', text: `No se importó: ${report.errors.join(' · ')}` })
          return
        }
        const clean = sanitizeConditionalData(parsed)
        if (!clean) {
          setStatus({ tone: 'error', text: 'No se pudo normalizar el JSON importado.' })
          return
        }
        onReplaceAll(clean)
        setStatus({
          tone: 'ok',
          text: `Importado «${file.name}»${report.warnings.length > 0 ? ` con ${report.warnings.length} aviso(s)` : ''}.`,
        })
      } catch (error) {
        setStatus({
          tone: 'error',
          text: `No se pudo leer el fichero: ${error instanceof Error ? error.message : 'error desconocido'}`,
        })
      }
    },
    [onReplaceAll],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6">
      <button
        type="button"
        aria-label="Cerrar configuración"
        onClick={close}
        className="fixed inset-0 cursor-default bg-night-950/80 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configuración de condicionales"
        className="panel animate-rise relative z-10 my-auto w-full max-w-4xl border-gold-400/20"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div className="min-w-0">
            <h2 className="font-display text-gold-gradient text-xl font-extrabold">
              Configuración · Condicionales
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Los cambios se guardan automáticamente en este navegador.{' '}
              {isCustom ? (
                <span className="text-gold-300">Estás usando una configuración personalizada.</span>
              ) : (
                <span>Usando la configuración por defecto del proyecto.</span>
              )}
            </p>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-candy-400/50 hover:text-candy-300"
          >
            <CloseIcon className="size-4" />
          </button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 sm:px-5">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`relative shrink-0 px-3 py-3 text-xs font-bold tracking-wide uppercase transition ${
                tab === item.id ? 'text-gold-300' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.label}
              {tab === item.id && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold-400" />
              )}
            </button>
          ))}
        </nav>

        <div className="max-h-[55vh] overflow-y-auto p-5 sm:p-6">
          {tab === 'json' ? (
            <RawConditionalsJsonEditor data={data} onApply={onReplaceAll} />
          ) : (
            <ConditionalsEditor data={data} onChange={onChange} section={tab} />
          )}
        </div>

        {!storageAvailable && (
          <p className="border-t border-candy-400/30 bg-candy-500/10 px-5 py-2 text-xs text-candy-200">
            No se pudo guardar en localStorage (posiblemente modo privado). Los cambios se perderán al recargar.
          </p>
        )}

        {status && (
          <p
            className={`border-t px-5 py-2 text-xs ${
              status.tone === 'ok'
                ? 'border-neon-400/30 bg-neon-500/10 text-neon-200'
                : 'border-candy-400/30 bg-candy-500/10 text-candy-200'
            }`}
          >
            {status.text}
          </p>
        )}

        <footer className="flex flex-wrap items-center gap-2 border-t border-white/10 p-5 sm:p-6">
          <button
            type="button"
            onClick={() => downloadJsonFile(data, 'conditionalsData.json')}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-gold-400/50 hover:text-gold-200"
          >
            <DownloadIcon className="size-4" /> Exportar
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-gold-400/50 hover:text-gold-200"
          >
            <UploadIcon className="size-4" /> Importar
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleImport(file)
              event.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => {
              onReset()
              setStatus({ tone: 'ok', text: 'Configuración restablecida a los valores de fábrica.' })
            }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-candy-400/50 hover:text-candy-300"
          >
            <ResetIcon className="size-4" /> Restablecer
          </button>

          <button
            type="button"
            onClick={close}
            className="ml-auto rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-5 py-2 text-xs font-extrabold tracking-wide text-night-950 uppercase transition hover:from-gold-200 hover:to-gold-400"
          >
            Listo
          </button>
        </footer>
      </div>
    </div>
  )
}
