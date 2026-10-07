import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConditionalCondition, ConditionalData, ConditionalResult, ConditionalRoll } from '../lib/conditionals'
import { rollConditional } from '../lib/conditionals'

/** Duración de la animación de un rodillo (igual que el Jackpot Gramatical). */
export const CONDITIONAL_REEL_DURATION_MS = 1150
/** Escalonado entre los 5 rodillos. */
export const CONDITIONAL_REEL_STAGGER_MS = 180
/** Tiempo total hasta que la máquina se considera detenida. */
export const CONDITIONAL_TOTAL_SPIN_MS =
  CONDITIONAL_REEL_STAGGER_MS * 4 + CONDITIONAL_REEL_DURATION_MS + 200

export interface ConditionalReelView {
  key: string
  title: string
  items: string[]
  /** Valor confirmado (el que se ve parado). */
  value: string
  /** Valor al que para el rodillo en la tirada en curso. */
  target: string
  delay: number
  accentClass: string
}

/** Etiqueta visible de una condición (p. ej. «study hard»). */
export const conditionLabel = (condition: ConditionalCondition): string =>
  condition.complement ? `${condition.verb.base} ${condition.complement}` : condition.verb.base

/** Etiqueta visible de un resultado. */
export const resultLabel = (result: ConditionalResult): string =>
  result.complement ? `${result.verb.base} ${result.complement}` : result.verb.base

export interface ConditionalSlotMachine {
  combo: ConditionalRoll
  reels: ConditionalReelView[]
  spinning: boolean
  spinToken: number
  spin: () => void
}

/**
 * Máquina de 5 rodillos para condicionales.
 *
 * Mantiene separado el valor confirmado (`combo`) del destino de la tirada
 * (`pending`), igual que `useSlotMachine`, para que la cinta arranque desde el
 * valor anterior y termine justo en el nuevo.
 */
export function useConditionalSlotMachine(data: ConditionalData): ConditionalSlotMachine {
  const [combo, setCombo] = useState<ConditionalRoll>(() => rollConditional(data))
  const [pending, setPending] = useState<ConditionalRoll | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [spinToken, setSpinToken] = useState(0)
  const timer = useRef<number | null>(null)
  const pendingRef = useRef<ConditionalRoll | null>(null)

  /* Si la configuración cambia y el valor confirmado deja de existir, se
     recalcula durante el render (patrón oficial de React para derivar estado). */
  const stillValid =
    data.usages.some((u) => u.id === combo.usage.id) &&
    data.subjects.some((s) => s.id === combo.subject.id) &&
    data.conditions.some((c) => c.id === combo.condition.id) &&
    data.results.some((r) => r.id === combo.result.id) &&
    data.polarities.some((p) => p.id === combo.polarity.id)

  if (!stillValid) setCombo(rollConditional(data))

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const spin = useCallback(() => {
    if (timer.current !== null) return
    const next = rollConditional(data)
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
    }, CONDITIONAL_TOTAL_SPIN_MS)
  }, [data])

  const reels = useMemo<ConditionalReelView[]>(() => {
    const next = pending ?? combo
    const usageItems = data.usages.map((u) => u.label)
    const subjectItems = data.subjects.map((s) => s.label)
    const conditionItems = data.conditions.map(conditionLabel)
    const resultItems = data.results.map(resultLabel)
    const polarityItems = data.polarities.map((p) => p.label)

    return [
      {
        key: 'usage',
        title: 'Usage / Meaning',
        items: usageItems,
        value: combo.usage.label,
        target: next.usage.label,
        delay: 0,
        accentClass: 'border-grape-500/40',
      },
      {
        key: 'subject',
        title: 'Subject (If)',
        items: subjectItems,
        value: combo.subject.label,
        target: next.subject.label,
        delay: CONDITIONAL_REEL_STAGGER_MS,
        accentClass: 'border-grape-500/40',
      },
      {
        key: 'condition',
        title: 'Condition (If)',
        items: conditionItems,
        value: conditionLabel(combo.condition),
        target: conditionLabel(next.condition),
        delay: CONDITIONAL_REEL_STAGGER_MS * 2,
        accentClass: 'border-gold-400/40',
      },
      {
        key: 'result',
        title: 'Result Action',
        items: resultItems,
        value: resultLabel(combo.result),
        target: resultLabel(next.result),
        delay: CONDITIONAL_REEL_STAGGER_MS * 3,
        accentClass: 'border-neon-400/40',
      },
      {
        key: 'polarity',
        title: 'Polarity & Stance',
        items: polarityItems,
        value: combo.polarity.label,
        target: next.polarity.label,
        delay: CONDITIONAL_REEL_STAGGER_MS * 4,
        accentClass: 'border-candy-400/40',
      },
    ]
  }, [combo, data, pending])

  return { combo, reels, spinning, spinToken, spin }
}
