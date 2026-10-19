import { useEffect, useMemo, useState } from 'react'
import { Flex, Tag } from 'antd'
import { useLeaderboard } from '../lib/useLeaderboard'
import { formatTime, ordinal, rankTeams, STATUS_LABEL } from '../lib/rank'
import type { RankedTeam, Status } from '../lib/types'

const PAGE_SIZE = 10
const PAGE_MS = 12_000

const STATUS_COLOR: Record<Status, string> = {
  waiting: 'default',
  running: 'blue',
  finished: 'green',
  dnf: 'red',
}

function Row({ team }: { team: RankedTeam }) {
  const podium = team.rank !== null && team.rank <= 3 ? `podium-${team.rank}` : ''
  return (
    <div className={`row ${podium} ${team.status}`}>
      <div className="row-pos">
        {team.rank !== null ? (
          <>
            <b>{team.rank}</b>
            <sup>{ordinal(team.rank)}</sup>
          </>
        ) : (
          <b>-</b>
        )}
      </div>
      <div className="row-team">
        <div className="row-name">{team.name}</div>
        <Flex gap={8} align="center" className="row-sub">
          {team.college && <span className="row-college">{team.college}</span>}
          {team.status !== 'finished' && <Tag color={STATUS_COLOR[team.status]}>{STATUS_LABEL[team.status]}</Tag>}
          {team.status === 'finished' && team.penalties > 0 && <Tag color="red">+{team.penalties} penalty</Tag>}
        </Flex>
      </div>
      <div className="row-time">{formatTime(team.finalMs)}</div>
    </div>
  )
}

export default function Display() {
  const { state, online } = useLeaderboard()
  const [page, setPage] = useState(0)

  const ranked = useMemo(() => (state ? rankTeams(state.teams, state.meta) : []), [state])
  const pages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE))

  useEffect(() => {
    if (pages < 2) return setPage(0)
    const id = setInterval(() => setPage((p) => (p + 1) % pages), PAGE_MS)
    return () => clearInterval(id)
  }, [pages])

  const current = Math.min(page, pages - 1)
  const visible = ranked.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  return (
    <div className="screen">
      <div className="px px-tl" />
      <div className="px px-br" />

      <header className="head">
        <Flex align="center" gap={20} className="bar">
          <img src="/assets/techfiesta-mark.png" alt="" className="mark" />
          <div>
            <div className="tf-name">TechFiesta</div>
            <div className="tf-sub">TENET '26 · IOIT ACM</div>
          </div>
        </Flex>
        <h1 className="title">
          <span>{state?.meta.title ?? 'Robo Race'}</span>
          <em>{state?.meta.subtitle ?? 'Leaderboard'}</em>
        </h1>
        <div className="cols">
          <span>Position</span>
          <span>Team</span>
          <span>Final time</span>
        </div>
      </header>

      <main className="list" key={current}>
        {visible.map((t) => (
          <Row key={t.id} team={t} />
        ))}
        {!state && <div className="empty">Connecting...</div>}
        {state && ranked.length === 0 && <div className="empty">Ready. Set. Race.</div>}
      </main>

      <footer className="foot">
        <img src="/assets/acm-logo-colour.png" alt="IOIT ACM" className="logo-acm" />
        <div className="foot-mid">
          <div className="tagline">Ready. Set. Race.</div>
          <div className="rule">Final time = run time + {state?.meta.penaltySeconds ?? 10}s per penalty</div>
          {pages > 1 && (
            <div className="dots">
              {Array.from({ length: pages }, (_, i) => (
                <i key={i} className={i === current ? 'on' : ''} />
              ))}
            </div>
          )}
        </div>
        <span className={`live ${online ? 'on' : ''}`}>
          <i /> {online ? 'LIVE' : 'OFFLINE'}
        </span>
      </footer>
    </div>
  )
}
