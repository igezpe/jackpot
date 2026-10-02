import { useEffect, useRef, useState } from 'react'

export interface ReelProps {
  /** Número del rodillo (1-4). */
  index: number
  /** Título corto bajo el rodillo. */
  title: string
  /** Valores posibles de este rodillo. */
  items: string[]
  /** Valor confirmado: el que se ve en reposo y el que hay que responder. */
  current: string
  /** Valor al que debe parar el rodillo en la tirada en curso. */
  target: string
  /** ¿Hay una tirada en curso en la máquina? */
  spinning: boolean
  /** Se incrementa en cada tirada para reiniciar la animación. */
  spinToken: number
  /** Retardo antes de arrancar este rodillo (efecto escalonado). */
  delay?: number
  duration?: number
  /** Color de acento del marco. */
  accentClass?: string
}

/** Altura de cada celda en píxeles. Debe coincidir con la clase `h-24` del marco. */
const ITEM_HEIGHT = 96
/** Número de fotogramas aleatorios antes de la celda final. */
const FRAMES = 12

type Phase = 'idle' | 'waiting' | 'moving'

/**
 * Un rodillo de tragamonedas.
 *
 * La animación usa una cinta vertical de celdas y una transición CSS de
 * `translateY`. Al terminar, la cinta se descarta y se vuelve a renderizar sólo
 * con el valor confirmado: no hay salto visual porque la última celda de la
 * cinta ya era el destino, y `current` pasa a ser ese mismo valor en el mismo
 * lote de render.
 */
export function Reel({
  index,
  title,
  items,
  current,
  target,
  spinning,
  spinToken,
  delay = 0,
  duration = 1150,
  accentClass = 'border-gold-400/40',
}: ReelProps) {
  /** Cinta en movimiento. Sólo se usa mientras el rodillo gira de verdad. */
  const [tape, setTape] = useState<string[]>([])
  const [offset, setOffset] = useState(0)
  const [transition, setTransition] = useState('none')
  const [phase, setPhase] = useState<Phase>('idle')

  // Props actuales para que el efecto de animación no dependa de ellas.
  const live = useRef({ items, current, target, duration, delay })
  useEffect(() => {
    live.current = { items, current, target, duration, delay }
  })

  /* Arranque de la animación: sólo depende del token de tirada. */
  useEffect(() => {
    if (!spinning || spinToken === 0) return
    let frameA = 0
    let frameB = 0
    let finishTimer = 0

    const start = () => {
      const { items: pool, current: from, target: to, duration: ms } = live.current
      const fallback = pool.length > 0 ? pool : [to]
      const blurbs = Array.from({ length: FRAMES }, () => fallback[Math.floor(Math.random() * fallback.length)] ?? to)

      // El primer elemento es el valor actual: la cinta arranca donde estaba.
      setTape([from, ...blurbs, to])
      setTransition('none')
      setOffset(0)
      setPhase('moving')

      // Doble rAF: primero se pinta la cinta nueva sin transición, luego se anima.
      frameA = requestAnimationFrame(() => {
        frameB = requestAnimationFrame(() => {
          setTransition(`transform ${ms}ms cubic-bezier(0.16, 0.84, 0.24, 1)`)
          setOffset(-FRAMES * ITEM_HEIGHT)
        })
      })

      finishTimer = window.setTimeout(() => setPhase('idle'), ms + 60)
    }

    setPhase('waiting')
    const timer = window.setTimeout(start, live.current.delay)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(finishTimer)
      cancelAnimationFrame(frameA)
      cancelAnimationFrame(frameB)
    }
  }, [spinToken, spinning])

  /* En reposo la cinta se descarta: se dibuja sólo el valor confirmado. */
  const moving = phase === 'moving'
  const cells = moving && tape.length > 0 ? tape : [current]
  const translateY = moving ? offset : 0
  const easing = moving ? transition : 'none'

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="text-center text-[0.6rem] font-semibold tracking-[0.22em] text-slate-500 uppercase">
        Rodillo {index}
      </p>

      <div
        role="group"
        aria-label={`Rodillo ${index}, ${title}. Valor actual: ${current}`}
        className={`relative h-24 overflow-hidden rounded-2xl border bg-night-950/80 shadow-inner transition-colors ${accentClass} ${
          moving ? 'shadow-[0_0_22px_-6px_var(--color-gold-400)]' : ''
        }`}
      >
        {/* Brillos del marco y máscara lateral */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white/10 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white/10 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-night-950/95 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night-950/95 to-transparent" />
        <div className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

        <div className="absolute top-0 left-0 w-full will-change-transform" style={{ transform: `translateY(${translateY}px)`, transition: easing }}>
          {cells.map((value, i) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`${i}-${value}`}
              className="flex h-24 items-center justify-center px-3 text-center"
            >
              <span
                className={`font-display text-lg leading-tight font-semibold break-words transition-opacity ${
                  moving ? 'text-slate-400 blur-[1.5px]' : 'text-gold-200'
                }`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-sm text-slate-600">rodillo vacío</div>
        )}
      </div>

      <p className="min-h-4 text-center text-[0.7rem] font-medium tracking-wide text-slate-500 uppercase">
        {title}
      </p>
    </div>
  )
}