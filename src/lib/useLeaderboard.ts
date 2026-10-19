import { useEffect, useState } from 'react'
import type { State } from './types'

/** Live state over SSE (EventSource reconnects on its own). */
export function useLeaderboard() {
  const [state, setState] = useState<State | null>(null)
  const [online, setOnline] = useState(false)

  useEffect(() => {
    const es = new EventSource('/api/stream')
    es.onmessage = (e) => {
      setState(JSON.parse(e.data))
      setOnline(true)
    }
    es.onerror = () => setOnline(false)
    return () => es.close()
  }, [])

  return { state, online }
}

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText)
  return res.status === 204 ? null : res.json()
}

export const api = {
  addTeam: (t: object = {}) => call('POST', '/api/teams', t),
  patchTeam: (id: string, t: object) => call('PATCH', `/api/teams/${id}`, t),
  deleteTeam: (id: string) => call('DELETE', `/api/teams/${id}`),
  putMeta: (m: object) => call('PUT', '/api/meta', m),
  reset: () => call('POST', '/api/reset'),
}
