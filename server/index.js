import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DATA_FILE = path.join(ROOT, 'data', 'state.json')
const PORT = Number(process.env.PORT) || 3000
const STATUSES = ['waiting', 'running', 'finished', 'dnf']

const DEFAULT_STATE = {
  meta: { title: 'Robo Race', subtitle: 'Leaderboard', penaltySeconds: 10 },
  teams: [],
}

function load() {
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

let state = load()
const clients = new Set()

function persist() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  const tmp = DATA_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2))
  fs.renameSync(tmp, DATA_FILE)
  const payload = `data: ${JSON.stringify(state)}\n\n`
  for (const res of clients) res.write(payload)
}

const str = (v, max = 60) => String(v ?? '').trim().slice(0, max)
const num = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)))

function cleanTeam(input, base = {}) {
  const t = { ...base }
  if ('name' in input) t.name = str(input.name) || 'Unnamed team'
  if ('college' in input) t.college = str(input.college, 80)
  if ('timeMs' in input) t.timeMs = input.timeMs === null ? null : num(input.timeMs, 0, 99 * 3600_000)
  if ('penalties' in input) t.penalties = num(input.penalties, 0, 999)
  if ('status' in input && STATUSES.includes(input.status)) t.status = input.status
  return t
}

// Only loopback and private LAN addresses may change data.
function isLocal(ip = '') {
  const a = ip.replace(/^::ffff:/, '')
  return (
    a === '::1' ||
    a.startsWith('127.') ||
    a.startsWith('10.') ||
    a.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(a) ||
    a.startsWith('169.254.') ||
    /^f[cd]/i.test(a) ||
    /^fe80:/i.test(a)
  )
}

const app = express()
app.use(express.json({ limit: '100kb' }))

app.get('/api/state', (_req, res) => res.json(state))

app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
  res.flushHeaders()
  res.write(`data: ${JSON.stringify(state)}\n\n`)
  clients.add(res)
  const ping = setInterval(() => res.write(': ping\n\n'), 20_000)
  req.on('close', () => {
    clearInterval(ping)
    clients.delete(res)
  })
})

app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || isLocal(req.socket.remoteAddress)) return next()
  res.status(403).json({ error: 'Writes are only allowed from the local network' })
})

app.post('/api/teams', (req, res) => {
  const team = cleanTeam(req.body ?? {}, {
    id: crypto.randomUUID(),
    name: 'New team',
    college: '',
    timeMs: null,
    penalties: 0,
    status: 'waiting',
  })
  state.teams.push(team)
  persist()
  res.status(201).json(team)
})

app.patch('/api/teams/:id', (req, res) => {
  const i = state.teams.findIndex((t) => t.id === req.params.id)
  if (i < 0) return res.status(404).json({ error: 'Not found' })
  state.teams[i] = cleanTeam(req.body ?? {}, state.teams[i])
  persist()
  res.json(state.teams[i])
})

app.delete('/api/teams/:id', (req, res) => {
  state.teams = state.teams.filter((t) => t.id !== req.params.id)
  persist()
  res.status(204).end()
})

app.put('/api/meta', (req, res) => {
  const b = req.body ?? {}
  state.meta = {
    title: str(b.title, 40) || state.meta.title,
    subtitle: str(b.subtitle, 40) || state.meta.subtitle,
    penaltySeconds: num(b.penaltySeconds ?? state.meta.penaltySeconds, 0, 600),
  }
  persist()
  res.json(state.meta)
})

app.post('/api/reset', (_req, res) => {
  state.teams = state.teams.map((t) => ({ ...t, timeMs: null, penalties: 0, status: 'waiting' }))
  persist()
  res.json(state)
})

const dist = path.join(ROOT, 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address)
  console.log(`\nRobo Race leaderboard running`)
  console.log(`  Admin (this laptop): http://localhost:${PORT}/admin`)
  for (const ip of ips) console.log(`  Display (LAN):       http://${ip}:${PORT}/`)
  console.log()
})
