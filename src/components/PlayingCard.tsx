import type { ReactNode, Ref } from 'react'

export interface PlayingCardProps {
  /** ¿Está dada vuelta mostrando el contenido? */
  flipped: boolean
  /** Se ejecuta al hacer clic o pulsar la carta (con teclado). */
  onFlip: () => void
  /** Contenido que se revela al dar vuelta la carta. */
  children: ReactNode
  /** Descripción accesible de la carta. */
  label?: string
  /** Palo decorativo de las esquinas (naipe clásico). */
  suit?: string
  /** Bloquea la interacción. */
  disabled?: boolean
  /** Ref al botón de la carta, para poder enfocarlo por teclado. */
  buttonRef?: Ref<HTMLButtonElement>
  className?: string
}

/**
 * Carta de naipe con volteo 3D.
 *
 * El contenedor rota 180° con una transición CSS y las dos caras se ocultan
 * mutuamente con `backface-visibility`, así que no se ve la de atrás. La cara
 * de contenido va pre-rotada para aparecer derecha cuando la carta se gira.
 */
export function PlayingCard({
  flipped,
  onFlip,
  children,
  label = 'Carta',
  suit = '♠',
  disabled = false,
  buttonRef,
  className = '',
}: PlayingCardProps) {
  return (
    <div className={`mx-auto w-full max-w-[19rem] ${className}`} style={{ perspective: '1400px' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onFlip}
        disabled={disabled}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? `${label} (boca arriba). Clic para ver el dorso.`
            : `${label} (boca abajo). Clic para dar vuelta.`
        }
        className="group relative block aspect-[5/7] w-full rounded-3xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400 disabled:cursor-default"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 620ms cubic-bezier(0.2, 0.75, 0.25, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Dorso (visible sin girar) */}
        <span
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden rounded-3xl border-[3px] border-white/85 shadow-[0_22px_45px_-18px_rgba(0,0,0,0.9)]"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            backgroundImage: 'linear-gradient(140deg, #a2142a 0%, #7c0f20 45%, #540915 100%)',
          }}
        >
          <span className="absolute inset-1.5 rounded-[1.05rem] border border-white/30" />
          <span
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 6px, transparent 6px 14px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.2) 0 6px, transparent 6px 14px)',
            }}
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-2xl border-2 border-gold-300/70 bg-night-950/45 font-display text-3xl leading-none text-gold-300 shadow-lg">
              ♦
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-3 text-center text-[0.6rem] font-bold tracking-[0.28em] text-white/70 uppercase">
            Tocá para girar
          </span>
        </span>

        {/* Cara (visible al girar) */}
        <span
          className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl border-[3px] border-white/85 bg-gradient-to-b from-white to-slate-100 shadow-[0_22px_45px_-18px_rgba(0,0,0,0.9)]"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2.5 left-3 font-display text-lg leading-none text-night-900"
          >
            {suit}
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 bottom-2.5 rotate-180 font-display text-lg leading-none text-night-900"
          >
            {suit}
          </span>
          {children}
        </span>
      </button>
    </div>
  )
}
