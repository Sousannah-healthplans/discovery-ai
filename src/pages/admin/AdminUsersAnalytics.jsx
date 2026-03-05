import DashboardLayout from '../../layouts/DashboardLayout';
import { SessionsLine } from '../../components/Charts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, BarChart, Bar, Legend } from 'recharts';
import { adminFetchOverview, adminFetchUsers, adminFetchUserOverview, adminFetchUserSessions, adminFetchUserEvents } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';

export default function AdminUsersAnalytics() {
  const [overview, setOverview] = useState({ totalUsers: 0, totalSessions: 0, avgSessionDurationSec: 0 })
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userOverview, setUserOverview] = useState(null)
  const [sessionsSeries, setSessionsSeries] = useState([])
  const [eventsOverTime, setEventsOverTime] = useState([])
  const [interactionsOverTime, setInteractionsOverTime] = useState([])
  const [pageviewsOverTime, setPageviewsOverTime] = useState([])
  const [formSubmitsOverTime, setFormSubmitsOverTime] = useState([])
  const [errorsOverTime, setErrorsOverTime] = useState([])
  const [stackedByType, setStackedByType] = useState([])
  const [durationBuckets, setDurationBuckets] = useState([])
  const heatmapCanvasRef = useRef(null)

  const baseUrl = BACKEND_URL
  const token = localStorage.getItem('authToken') || ''

  useEffect(() => {
    if (!baseUrl || !token) return
    adminFetchOverview(baseUrl, token).then(data => setOverview(data)).catch(()=>{})
    adminFetchUsers(baseUrl, token).then(list => {
      setUsers(list)
      if (!selectedUserId && list && list.length) {
        // Select the most active user
        const preferred = list.sort((a, b) => (b.events || 0) - (a.events || 0))[0]
        setSelectedUserId(preferred.userId)
      }
    }).catch(()=>{})
  }, [baseUrl, token, selectedUserId])

  useEffect(() => {
    if (!baseUrl || !token || !selectedUserId) return
    let cancelled = false
    ;(async () => {
      try {
        const [ov, sess, evts] = await Promise.all([
          adminFetchUserOverview(baseUrl, selectedUserId, token),
          adminFetchUserSessions(baseUrl, selectedUserId, token, 1000),
          adminFetchUserEvents(baseUrl, selectedUserId, token, undefined, 500),
        ])
        if (cancelled) return
        setUserOverview(ov)
        // Build sessions per day series
        const byDay = new Map()
        for (const s of sess) {
          const day = new Date(s.end || s.start).toISOString().slice(0,10)
          byDay.set(day, (byDay.get(day)||0) + 1)
        }
        const series = Array.from(byDay.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([date, count])=>({ date, sessions: count }))
        setSessionsSeries(series)
        // Events over time (daily)
        const byDate = new Map()
        for (const e of evts) {
          const day = new Date(e.ts).toISOString().slice(0,10)
          byDate.set(day, (byDate.get(day)||0) + 1)
        }
        const eventsSeries = Array.from(byDate.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([date, value])=>({ date, value }))
        setEventsOverTime(eventsSeries)

        // Interactions vs pageviews vs form submits vs errors over time
        const pageViewTypes = new Set(['page_view','pageview','route_change','navigation'])
        const interactionTypes = new Set(['click','button_click','input','keydown','keyup','change'])
        const errorTypes = new Set(['error','console_error','network_error'])
        const mapOverTime = (filter) => {
          const m = new Map()
          for (const e of evts) {
            if (!filter(e)) continue
            const d = new Date(e.ts).toISOString().slice(0,10)
            m.set(d, (m.get(d)||0) + 1)
          }
          return Array.from(m.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,value])=>({ date, value }))
        }
        setInteractionsOverTime(mapOverTime(e=>interactionTypes.has(e.type)))
        setPageviewsOverTime(mapOverTime(e=>pageViewTypes.has(e.type)))
        setFormSubmitsOverTime(mapOverTime(e=>e.type==='form_submit'))
        setErrorsOverTime(mapOverTime(e=>errorTypes.has(e.type)))

        // Stacked by top event types per day (top 3)
        const typeCounts = new Map()
        for (const e of evts) typeCounts.set(e.type, (typeCounts.get(e.type)||0)+1)
        const topTypes = Array.from(typeCounts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t])=>t)
        const dayTypeMap = new Map() // date -> {type: count}
        for (const e of evts) {
          if (!topTypes.includes(e.type)) continue
          const d = new Date(e.ts).toISOString().slice(0,10)
          const rec = dayTypeMap.get(d) || {}
          rec[e.type] = (rec[e.type]||0)+1
          dayTypeMap.set(d, rec)
        }
        // Build stacked series per day for top event types
        const stacked = Array.from(dayTypeMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, rec]) => {
            const base = { date };
            topTypes.forEach(t => {
              base[t] = rec[t] || 0;
            });
            return base;
          })
        setStackedByType(stacked)

        // Session duration buckets
        const ranges = [
          { range: '0-30s', min:0, max:30 },
          { range: '30-60s', min:30, max:60 },
          { range: '1-5m', min:60, max:300 },
          { range: '5-15m', min:300, max:900 },
          { range: '15m+', min:900, max:Infinity },
        ]
        const counts = ranges.map(r=>({ ...r, count: 0 }))
        for (const s of sess) {
          const d = Number(s.durationSec)||0
          const idx = counts.findIndex(r=> d>=r.min && d<r.max)
          if (idx>=0) counts[idx].count++
        }
        setDurationBuckets(counts)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [baseUrl, token, selectedUserId])

  const userOptions = useMemo(() => (users || []).map(u => ({ 
    label: `${u.username || 'User'} ${u.userId?.slice(0, 8)} (${u.events || 0} events)`, 
    value: u.userId 
  })), [users])

  return (
    <DashboardLayout variant="admin">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Users Analytics</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500 dark:text-slate-300">Extension User</label>
          <select value={selectedUserId} onChange={e=>setSelectedUserId(e.target.value)} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-black/40 dark:border-white/10 dark:text-white">
            {userOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SessionsLine data={sessionsSeries} />
        <div className="rounded-2xl p-4 bg-white border border-slate-200 h-72 dark:bg-white/5 dark:border-white/10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={eventsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748B" tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" name="Events" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Business KPIs */}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
          <div className="text-sm text-slate-400">Total Extension Users</div>
          <div className="mt-1 text-2xl font-bold">{overview.totalUsers}</div>
        </div>
        <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
          <div className="text-sm text-slate-400">Total Sessions</div>
          <div className="mt-1 text-2xl font-bold">{overview.totalSessions}</div>
        </div>
        <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
          <div className="text-sm text-slate-400">Avg Session Duration</div>
          <div className="mt-1 text-2xl font-bold">{Math.floor((overview.avgSessionDurationSec||0)/60)}m {(overview.avgSessionDurationSec||0)%60}s</div>
        </div>
        <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
          <div className="text-sm text-slate-400">Events Today</div>
          <div className="mt-1 text-2xl font-bold">{eventsOverTime.filter(d => d.date === new Date().toISOString().slice(0,10))[0]?.value || 0}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl p-4 bg-white border border-slate-200 h-72 dark:bg-white/5 dark:border-white/10">
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">Screenshots (user)</div>
          <div className="text-3xl font-bold mb-4">{userOverview?.screenshots || 0}</div>
          <ResponsiveContainer width="100%" height="70%">
            <AreaChart data={pageviewsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748B" tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" tickLine={false} axisLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" name="Page Views" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl p-4 bg-white border border-slate-200 h-72 dark:bg-white/5 dark:border-white/10">
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">Interactions vs Forms vs Errors</div>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748B" tickLine={false} axisLine={false} allowDuplicatedCategory={false} />
              <YAxis stroke="#64748B" tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Line dataKey="value" data={interactionsOverTime} name="Interactions" stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line dataKey="value" data={formSubmitsOverTime} name="Form Submits" stroke="#a78bfa" strokeWidth={2} dot={false} />
              <Line dataKey="value" data={errorsOverTime} name="Errors" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl p-4 bg-white border border-slate-200 h-72 dark:bg-white/5 dark:border-white/10">
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">Event Types (stacked)</div>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={stackedByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748B" tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" tickLine={false} axisLine={false} />
              <Tooltip />
              {Object.keys(stackedByType[0]||{}).filter(k=>k!=='date').map((k, idx) => (
                <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={["#06b6d4","#f59e0b","#8b5cf6"][idx%3]} fill={["#06b6d4","#f59e0b","#8b5cf6"][idx%3]} fillOpacity={0.25} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl p-4 bg-white border border-slate-200 h-72 dark:bg-white/5 dark:border-white/10">
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">Session Duration Histogram</div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={durationBuckets}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" stroke="#64748B" tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {userOverview && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Event Types (user)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(userOverview.byType || {}).map(([type, count]) => (
              <div key={type} className="rounded-xl p-3 bg-white/5 border border-white/10">
                <div className="text-xs uppercase tracking-wide text-slate-400">{type}</div>
                <div className="text-xl font-bold mt-1">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Canvas Heatmap (hourly buckets) */}
      <CanvasHourlyHeatmap ref={heatmapCanvasRef} events={eventsOverTime} />
    </DashboardLayout>
  );
}

// Lightweight canvas-based hourly heatmap component
function CanvasHourlyHeatmap({ events }, ref) {
  const canvasRef = useRef(null)
  const width = 600
  const height = 120
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,width,height)
    // Build 24 buckets from events (approximate using last 24 dates)
    const buckets = new Array(24).fill(0)
    const today = new Date()
    const byDate = new Map(events.map(d => [d.date, d.value]))
    for (let i = 23; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const key = day.toISOString().slice(0,10)
      buckets[23 - i] = byDate.get(key) || 0
    }
    const max = Math.max(1, ...buckets)
    const cellW = Math.floor(width / 24)
    const cellH = height
    for (let i = 0; i < 24; i++) {
      const v = buckets[i]
      const alpha = 0.15 + 0.85 * (v / max)
      ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`
      ctx.fillRect(i * cellW, 0, cellW - 2, cellH)
    }
    // Axis labels (every 6 buckets)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px system-ui'
    for (let i = 0; i < 24; i += 6) {
      ctx.fillText(`${24 - i}d`, i * cellW + 2, 14)
    }
  }, [events])
  return (
    <div className="mt-8 rounded-2xl p-4 bg-white/5 border border-white/10">
      <div className="text-sm text-slate-400 mb-2">Activity Heatmap (Last 24 days)</div>
      <canvas ref={canvasRef} style={{ width: '100%', height: 120 }} />
    </div>
  )
}

