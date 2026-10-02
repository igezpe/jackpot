import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Combo, ReelsData } from '../types'

/** Duración de la animación de un rodillo. */
export const REEL_DURATION_MS = 1150
/** Escalonado entre rodillos: 0, 180, 360, 540 ms. */
export const REEL_STAGGER_MS = 180
/** Tiempo total hasta que la máquina se considera detenida. */
export const TOTAL_SPIN_MS = REEL_STAGGER_MS * 3 + REEL_DURATION_MS + 200

export type ReelKey = 'subject' | 'verb' | 'sentenceType' | 'moment'

export interface ReelView {
  key: ReelKey
  items: string[]
  /** Valor confirmado (el que se ve parado y el que hay que responder). */
  value: string
  /** Valor al que debe parar el rodillo en esta tirada. */
  target: string
  delay: number
}

export interface SlotMachine {
  /** Combinación mostrada: es la que hay que responder. */
  combo: Combo
  reels: Record<ReelKey, ReelView>
  spinning: boolean
  spinToken: number
  spin: () => void
}

function pickIndex(length: number, avoid: number): number {
  if (length <= 0) return -1
  if (length <= 1) return 0
  const idx = Math.floor(Math.random() * length)
  // Evita repetir el valor anterior cuando hay alternativa: da sensación de juego.
  return idx === avoid ? (idx + 1) % length : idx
}

const FALLBACK: Combo = {
  subject: 'I',
  verb: { id: '0', verb: 'Do', object: 'it', past: 'did', participle: 'done' },
  sentenceType: { id: 'aff', label: '[ + ] Affirmative', type: 'affirmative' },
  moment: { id: 'habit', label: 'Habit or Routine', tense: 'present_simple' },
}

/** Elige una combinación al azar entre lo que hay en los 4 rodillos. */
export function pickCombo(data: ReelsData, previous?: Combo): Combo {
  const p = previous
  const subjectIdx = pickIndex(data.subjects.length, p ? data.subjects.indexOf(p.subject) : -1)
  const verbIdx = pickIndex(data.verbs.length, p ? data.verbs.indexOf(p.verb) : -1)
  const typeIdx = pickIndex(data.sentenceTypes.length, p ? data.sentenceTypes.indexOf(p.sentenceType) : -1)
  const momentIdx = pickIndex(data.moments.length, p ? data.moments.indexOf(p.moment) : -1)

  return {
    subject: subjectIdx >= 0 ? data.subjects[subjectIdx] : (FALLBACK.subject as string),
    verb: verbIdx >= 0 ? data.verbs[verbIdx] : FALLBACK.verb,
    sentenceType: typeIdx >= 0 ? data.sentenceTypes[typeIdx] : FALLBACK.sentenceType,
    moment: momentIdx >= 0 ? data.moments[momentIdx] : FALLBACK.moment,
  }
}

/**
 * Lógica de la máquina.
 *
 * Mantiene separados el valor **confirmado** (`combo`, el que se ve parado y el
 * que debe responderse) y el valor **destino** de la tirada en curso (`target`).
 * El destino sólo pasa a ser confirmado cuando los rodillos han terminado.
 */
export function useSlotMachine(data: ReelsData): SlotMachine {
  const [combo, setCombo] = useState<Combo>(() => pickCombo(data))
  const [pending, setPending] = useState<Combo | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [spinToken, setSpinToken] = useState(0)
  const timer = useRef<number | null>(null)
  const pendingRef = useRef<Combo | null>(null)

  /* Textos de cada rodillo, memorizados para no reiniciar la animación. */
  const verbLabels = useMemo(() => data.verbs.map((verb) => `${verb.verb} - ${verb.object}`), [data.verbs])
  const typeLabels = useMemo(() => data.sentenceTypes.map((t) => t.label), [data.sentenceTypes])
  const momentLabels = useMemo(() => data.moments.map((m) => m.label), [data.moments])

  /* Si el usuario edita la configuración y el valor confirmado deja de existir,
     se reajusta durante el render para no dejar un rodillo "colgado". Es el
     patrón oficial de React para derivar estado a partir de props. */
  const stillValid =
    data.subjects.includes(combo.subject) &&
    data.sentenceTypes.some((t) => t.id === combo.sentenceType.id) &&
    data.moments.some((m) => m.id === combo.moment.id) &&
    data.verbs.some((v) => v.id === combo.verb.id)

  if (!stillValid) setCombo(pickCombo(data))

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const spin = useCallback(() => {
    if (timer.current !== null) return
    const next = pickCombo(data, combo)
    pendingRef.current = next
    setPending(next)
    setSpinning(true)
    setSpinToken((n) => n + 1)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setSpinning(false)
      if (pendingRef.current) setCombo(pendingRef.current)
      setPending(null)
      pendingRef.current = null
    }, TOTAL_SPIN_MS)
  }, [combo, data])

  const label = (list: string[], index: number, fallback: string) => list[index] ?? fallback

  const reels = useMemo<Record<ReelKey, ReelView>>(() => {
    const next = pending ?? combo
    return {
      subject: {
        key: 'subject',
        items: data.subjects,
        value: combo.subject,
        target: next.subject,
        delay: 0,
      },
      verb: {
        key: 'verb',
        items: verbLabels,
        value: label(verbLabels, data.verbs.indexOf(combo.verb), `${combo.verb.verb} - ${combo.verb.object}`),
        target: label(verbLabels, data.verbs.indexOf(next.verb), `${next.verb.verb} - ${next.verb.object}`),
        delay: REEL_STAGGER_MS,
      },
      sentenceType: {
        key: 'sentenceType',
        items: typeLabels,
        value: label(typeLabels, data.sentenceTypes.indexOf(combo.sentenceType), combo.sentenceType.label),
        target: label(typeLabels, data.sentenceTypes.indexOf(next.sentenceType), next.sentenceType.label),
        delay: REEL_STAGGER_MS * 2,
      },
      moment: {
        key: 'moment',
        items: momentLabels,
        value: label(momentLabels, data.moments.indexOf(combo.moment), combo.moment.label),
        target: label(momentLabels, data.moments.indexOf(next.moment), next.moment.label),
        delay: REEL_STAGGER_MS * 3,
      },
    }
  }, [combo, data, momentLabels, pending, typeLabels, verbLabels])

  return { combo, reels, spinning, spinToken, spin }
}