import type { Meta, RankedTeam, Status, Team } from './types'

export const STATUS_LABEL: Record<Status, string> = {
  waiting: 'Waiting',
  running: 'On track',
  finished: 'Finished',
  dnf: 'DNF',
}

const ORDER: Record<Status, number> = { finished: 0, running: 1, waiting: 2, dnf: 3 }

/** Final time = completion time + penalties. Lowest wins; unfinished teams follow. */
export function rankTeams(teams: Team[], meta: Meta): RankedTeam[] {
  const withFinal = teams.map((t) => ({
    ...t,
    rank: null as number | null,
    finalMs:
      t.status === 'finished' && t.timeMs !== null
        ? t.timeMs + t.penalties * meta.penaltySeconds * 1000
        : null,
  }))
  withFinal.sort((a, b) => {
    if (a.finalMs !== null && b.finalMs !== null) return a.finalMs - b.finalMs
    if (a.finalMs !== null) return -1
    if (b.finalMs !== null) return 1
    return ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name)
  })
  let rank = 0
  let prev: number | null = null
  withFinal.forEach((t, i) => {
    if (t.finalMs === null) return
    // Ties share a rank.
    if (t.finalMs !== prev) rank = i + 1
    t.rank = rank
    prev = t.finalMs
  })
  return withFinal
}

export function formatTime(ms: number | null): string {
  if (ms === null) return '--:--.---'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const r = ms % 1000
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`
}

export function ordinal(n: number): string {
  const v = n % 100
  if (v >= 11 && v <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}
