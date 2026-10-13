/** Contador global de logros (aciertos/fallos) persistido en localStorage. */
export const STATS_STORAGE_KEY = 'jackpot.stats.v1'

export interface AchievementStats {
  solved: number
  misses: number
}

export function loadStats(): AchievementStats {
  if (typeof window === 'undefined') return { solved: 0, misses: 0 }
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY)
    if (!raw) return { solved: 0, misses: 0 }
    const parsed = JSON.parse(raw) as { solved?: unknown; misses?: unknown }
    const solved = Number(parsed.solved)
    const misses = Number(parsed.misses)
    return {
      solved: Number.isFinite(solved) && solved >= 0 ? solved : 0,
      misses: Number.isFinite(misses) && misses >= 0 ? misses : 0,
    }
  } catch {
    return { solved: 0, misses: 0 }
  }
}

export function saveStats(stats: AchievementStats): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats))
  } catch {
    /* sin almacenamiento disponible */
  }
}
