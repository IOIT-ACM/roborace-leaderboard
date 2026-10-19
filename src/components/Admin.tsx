import { useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Flex, InputNumber, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined, ReloadOutlined, DesktopOutlined } from '@ant-design/icons'
import { api, useLeaderboard } from '../lib/useLeaderboard'
import { formatTime, rankTeams, STATUS_LABEL } from '../lib/rank'
import type { RankedTeam, Status } from '../lib/types'

/** Text field that saves on blur or Enter, not on every keystroke. */
function TextCell({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  const commit = () => v !== value && onSave(v)
  return <Input value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} onPressEnter={commit} />
}

/** mm : ss . ms inputs for the run time. */
function TimeCell({ ms, onSave }: { ms: number | null; onSave: (ms: number | null) => void }) {
  const parts = ms === null ? { m: null, s: null, r: null } : { m: Math.floor(ms / 60000), s: Math.floor((ms % 60000) / 1000), r: ms % 1000 }
  const [p, setP] = useState(parts)
  useEffect(() => setP(parts), [ms]) // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => {
    const empty = p.m === null && p.s === null && p.r === null
    const next = empty ? null : (p.m ?? 0) * 60000 + (p.s ?? 0) * 1000 + (p.r ?? 0)
    if (next !== ms) onSave(next)
  }
  const field = (key: 'm' | 's' | 'r', max: number, ph: string, width: number) => (
    <InputNumber
      controls={false}
      min={0}
      max={max}
      precision={0}
      placeholder={ph}
      value={p[key]}
      style={{ width }}
      onChange={(v) => setP((o) => ({ ...o, [key]: v }))}
      onBlur={commit}
      onPressEnter={commit}
    />
  )
  return (
    <Space.Compact>
      {field('m', 99, 'min', 64)}
      {field('s', 59, 'sec', 64)}
      {field('r', 999, 'ms', 72)}
    </Space.Compact>
  )
}

export default function Admin() {
  const { message } = App.useApp()
  const { state, online } = useLeaderboard()

  useEffect(() => {
    document.documentElement.style.fontSize = '16px'
    document.body.style.background = '#fff'
  }, [])

  const run = (p: Promise<unknown>) => p.catch((e: Error) => message.error(e.message))

  const ranked = useMemo(() => (state ? rankTeams(state.teams, state.meta) : []), [state])
  // Edit in registration order so rows don't jump while typing.
  const rows = useMemo(() => {
    const byId = new Map(ranked.map((t) => [t.id, t]))
    return (state?.teams ?? []).map((t) => byId.get(t.id)!)
  }, [ranked, state])

  const patch = (id: string, body: object) => run(api.patchTeam(id, body))

  return (
    <div className="admin" style={{ maxWidth: 1180, margin: '0 auto', padding: 24 }}>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 20 }}>
        <Flex align="center" gap={16}>
          <img src="/assets/techfiesta-mark.png" alt="TechFiesta" style={{ height: 56 }} />
          <div>
            <Typography.Title level={3} style={{ margin: 0, fontFamily: "'Pixelify Sans', monospace", textTransform: 'uppercase' }}>
              Robo Race Control
            </Typography.Title>
            <Typography.Text type="secondary">Changes appear on the display instantly</Typography.Text>
          </div>
        </Flex>
        <Space>
          <Tag color={online ? 'green' : 'red'}>{online ? 'Connected' : 'Offline'}</Tag>
          <Button icon={<DesktopOutlined />} href="/" target="_blank">
            Open display
          </Button>
        </Space>
      </Flex>

      <Card
        title="Teams"
        extra={
          <Space>
            <Popconfirm
              title="Reset all times?"
              description="Clears times and penalties for every team."
              okText="Reset"
              onConfirm={() => run(api.reset())}
            >
              <Button icon={<ReloadOutlined />}>Reset runs</Button>
            </Popconfirm>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => run(api.addTeam())}>
              Add team
            </Button>
          </Space>
        }
      >
        <Table<RankedTeam>
          rowKey="id"
          dataSource={rows}
          pagination={false}
          loading={!state}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'No teams yet. Click "Add team".' }}
          columns={[
            {
              title: 'Rank',
              width: 70,
              render: (_, t) => (t.rank !== null ? <Typography.Text strong>{t.rank}</Typography.Text> : '-'),
            },
            {
              title: 'Team',
              render: (_, t) => <TextCell value={t.name} onSave={(name) => patch(t.id, { name })} />,
            },
            {
              title: 'College',
              render: (_, t) => (
                <TextCell value={t.college} placeholder="Optional" onSave={(college) => patch(t.id, { college })} />
              ),
            },
            {
              title: 'Run time',
              render: (_, t) => <TimeCell ms={t.timeMs} onSave={(timeMs) => patch(t.id, { timeMs })} />,
            },
            {
              title: `Penalties (+${state?.meta.penaltySeconds ?? 10}s)`,
              width: 130,
              render: (_, t) => (
                <InputNumber min={0} max={999} precision={0} value={t.penalties} style={{ width: 90 }} onChange={(v) => v !== null && patch(t.id, { penalties: v })} />
              ),
            },
            {
              title: 'Status',
              width: 140,
              render: (_, t) => (
                <Select<Status>
                  value={t.status}
                  style={{ width: 120 }}
                  onChange={(status) => patch(t.id, { status })}
                  options={(Object.keys(STATUS_LABEL) as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                />
              ),
            },
            {
              title: 'Final',
              width: 120,
              render: (_, t) => <Typography.Text strong>{formatTime(t.finalMs)}</Typography.Text>,
            },
            {
              width: 60,
              render: (_, t) => (
                <Popconfirm title={`Delete ${t.name}?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => run(api.deleteTeam(t.id))}>
                  <Button danger type="text" icon={<DeleteOutlined />} aria-label="Delete team" />
                </Popconfirm>
              ),
            },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ margin: '12px 0 0' }}>
          Only teams marked <b>Finished</b> with a run time are ranked. Final time = run time + penalties.
        </Typography.Paragraph>
      </Card>

      {state && (
        <Card title="Display settings" style={{ marginTop: 20 }}>
          <Flex gap={16} wrap>
            <label>
              <div>Title</div>
              <TextCell value={state.meta.title} onSave={(title) => run(api.putMeta({ ...state.meta, title }))} />
            </label>
            <label>
              <div>Subtitle</div>
              <TextCell value={state.meta.subtitle} onSave={(subtitle) => run(api.putMeta({ ...state.meta, subtitle }))} />
            </label>
            <label>
              <div>Penalty seconds</div>
              <InputNumber min={0} max={600} value={state.meta.penaltySeconds} onChange={(v) => v !== null && run(api.putMeta({ ...state.meta, penaltySeconds: v }))} />
            </label>
          </Flex>
        </Card>
      )}
    </div>
  )
}
