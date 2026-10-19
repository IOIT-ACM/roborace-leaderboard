export type Status = 'waiting' | 'running' | 'finished' | 'dnf'

export interface Team {
  id: string
  name: string
  college: string
  timeMs: number | null
  penalties: number
  status: Status
}

export interface Meta {
  title: string
  subtitle: string
  penaltySeconds: number
}

export interface State {
  meta: Meta
  teams: Team[]
}

export interface RankedTeam extends Team {
  rank: number | null
  finalMs: number | null
}
