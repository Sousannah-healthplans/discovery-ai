import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import MetricCard from '../../components/MetricCard'
import DataTable from '../../components/DataTable'
import ScreenshotGallery from '../../components/ScreenshotGallery'
import ClaimDetailModal from '../../components/ClaimDetailModal'
import { BACKEND_URL } from '../../lib/config'
import { pmExportClaimsCsv, pmFetchClaimAnalytics, pmFetchClaims, pmFetchClaimDetail, pmFetchScreenshots, pmReprocessClaims } from '../../lib/api'
import { Activity, BarChart3, Clock, Database, Download, Eye, FileText, Tag, X, RefreshCw, Mail } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts'

const CHART_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

export default function AdminClaims() {
  const baseUrl = BACKEND_URL?.replace(/\/$/, '') || ''
  const token = localStorage.getItem('authToken') || ''

  const [claims, setClaims] = useState([])
  const [screenshots, setScreenshots] = useState([])
  const [analytics, setAnalytics] = useState({
    byStatus: [],
    byType: [],
    byProvider: [],
    duration: { avgSec: 0, maxSec: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('table')
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [claimDetail, setClaimDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedClaimForModal, setSelectedClaimForModal] = useState(null)

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0))
    const mins = Math.floor(total / 60)
    const secs = total % 60
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const cellValue = (val, maxLen = 40) => {
    if (val == null || val === '') return ''
    const s = String(val).trim()
    if (/Service\s+Details|CPT\s+Code|Billed\s+Amount|Allowed\s+Amount/i.test(s)) return '—'
    if (s.length > maxLen) return s.slice(0, maxLen) + '…'
    return s
  }

  useEffect(() => {
    if (!baseUrl || !token) return
    setLoading(true)
    Promise.all([
      pmFetchClaims(baseUrl, token, 500).catch(() => []),
      pmFetchClaimAnalytics(baseUrl, token).catch(() => ({
        byStatus: [],
        byType: [],
        byProvider: [],
        duration: { avgSec: 0, maxSec: 0 }
      })),
      pmFetchScreenshots(baseUrl, token, 100).catch(() => [])
    ])
      .then(([list, analytic, shots]) => {
        setClaims(Array.isArray(list) ? list : [])
        setAnalytics(analytic || { byStatus: [], byType: [], byProvider: [], duration: { avgSec: 0, maxSec: 0 } })
        setScreenshots(Array.isArray(shots) ? shots : [])
      })
      .catch((err) => {
        console.error('Error loading admin claims:', err)
        setClaims([])
        setScreenshots([])
      })
      .finally(() => setLoading(false))
  }, [baseUrl, token])

  const rows = useMemo(() => {
    return claims.map(c => ({
      id: c._id?.toString() || String(Math.random()),
      claimId: c.claimId || c.ediClaimId || '(unknown)',
      reopened: c.isReopened ? (c.reopenSequence ? `Reopen #${c.reopenSequence}` : 'Reopened') : '',
      userEmail: c.userEmail || '—',
      status: c.status || 'Needs Review',
      claimType: cellValue(c.claimType, 30) || '—',
      providerName: cellValue(c.providerName),
      patientName: cellValue(c.patientName),
      memberId: cellValue(c.memberId, 20),
      receivedDate: c.receivedDate ? new Date(c.receivedDate).toLocaleDateString() : '',
      duration: formatDuration(c.processingDurationSec ?? 0),
      onClick: () => setSelectedClaim(c)
    }))
  }, [claims])

  const columns = [
    { key: 'claimId', header: 'Claim ID' },
    { key: 'reopened', header: 'Reopened' },
    { key: 'userEmail', header: 'User email' },
    { key: 'status', header: 'Status' },
    { key: 'claimType', header: 'Type' },
    { key: 'providerName', header: 'Provider' },
    { key: 'patientName', header: 'Patient' },
    { key: 'memberId', header: 'Member ID' },
    { key: 'receivedDate', header: 'Received' },
    { key: 'duration', header: 'Processing Time' }
  ]

  const screenshotItems = useMemo(() => {
    return screenshots.map((s, idx) => {
      const eventData = s.data || {}
      let directUrl = ''
      if (eventData.cloudinaryUrl) directUrl = eventData.cloudinaryUrl
      else if (eventData.screenshotFilename) directUrl = `${baseUrl}/screenshots/${eventData.screenshotFilename}`
      else if (eventData.dataUrl) directUrl = eventData.dataUrl
      else if (eventData.url && String(eventData.url).startsWith('data:image')) directUrl = eventData.url
      const proxyUrl = baseUrl && s._id ? `${baseUrl.replace(/\/$/, '')}/api/pm/screenshots/${s._id}/image` : ''
      const url = proxyUrl || directUrl
      if (!url) return null
      return {
        id: `${s._id}_${idx}`,
        _id: s._id,
        url,
        directUrl: directUrl || undefined,
        proxyUrl: proxyUrl || undefined,
        ocrText: s.ocrText || '',
        ocrTags: s.ocrTags || [],
        ocrProcessed: s.ocrProcessed,
        timestamp: s.ts ? new Date(s.ts).toISOString() : new Date().toISOString(),
        device: eventData.device || 'Unknown',
        browser: eventData.browser || 'Unknown'
      }
    }).filter(Boolean)
  }, [screenshots, baseUrl])

  const chartOverTime = useMemo(() => {
    const byMonth = {}
    claims.forEach((c) => {
      const d = c.receivedDate || c.firstSeenTs || c.lastSeenTs
      if (!d) return
      const date = new Date(d)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      byMonth[key] = (byMonth[key] || 0) + 1
    })
    return Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => ({ month, count, name: month }))
  }, [claims])

  const handleExportCsv = async () => {
    if (!baseUrl || !token) return
    try {
      setExporting(true)
      const blob = await pmExportClaimsCsv(baseUrl, token)
      if (!blob || blob.size === 0) {
        alert('Export returned no data.')
        return
      }
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'claims_export.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 200)
    } catch (e) {
      console.error('Failed to export claims:', e)
      alert(e?.message || 'Failed to export.')
    } finally {
      setExporting(false)
    }
  }

  const handleReprocess = async () => {
    if (!baseUrl || !token) return
    try {
      setReprocessing(true)
      const result = await pmReprocessClaims(baseUrl, token, 500)
      if (result.started || result.message) {
        alert(result.message || 'Reprocess started. Refresh in a few minutes.')
      } else {
        alert(`Reprocess complete!\n\nProcessed: ${result.processed}\nCreated: ${result.created}\nUpdated: ${result.updated}\nSkipped: ${result.skipped}\nFailed: ${result.failed}\nTotal: ${result.total}`)
      }
      const [list, analytic, shots] = await Promise.all([
        pmFetchClaims(baseUrl, token, 2000),
        pmFetchClaimAnalytics(baseUrl, token),
        pmFetchScreenshots(baseUrl, token, 500)
      ])
      setClaims(Array.isArray(list) ? list : [])
      setAnalytics(analytic || analytics)
      setScreenshots(Array.isArray(shots) ? shots : [])
    } catch (e) {
      console.error('Failed to reprocess claims:', e)
      alert(e?.message || 'Failed to reprocess.')
    } finally {
      setReprocessing(false)
    }
  }

  const refreshScreenshots = async () => {
    if (!baseUrl || !token) return
    try {
      const shots = await pmFetchScreenshots(baseUrl, token, 500)
      setScreenshots(Array.isArray(shots) ? shots : [])
    } catch (e) {
      console.error('Failed to refresh screenshots:', e)
    }
  }

  const refreshClaims = async () => {
    if (!baseUrl || !token) return
    setLoading(true)
    try {
      const [list, analytic, shots] = await Promise.all([
        pmFetchClaims(baseUrl, token, 2000),
        pmFetchClaimAnalytics(baseUrl, token),
        pmFetchScreenshots(baseUrl, token, 500)
      ])
      setClaims(Array.isArray(list) ? list : [])
      setAnalytics(analytic || analytics)
      setScreenshots(Array.isArray(shots) ? shots : [])
    } catch (e) {
      console.error('Failed to refresh claims:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout variant="admin">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading all claims...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const totalClaims = claims.length
  const distinctProviders = new Set(claims.map(c => c.providerName).filter(Boolean)).size
  const avgDurationSec = analytics?.duration?.avgSec || 0
  const chartByStatus = (analytics.byStatus || []).map((item, i) => ({ name: item._id || 'Unknown', count: item.count, fill: CHART_COLORS[i % CHART_COLORS.length] }))
  const chartByType = (analytics.byType || []).map((item, i) => ({ name: (item._id || 'Unknown').slice(0, 20), count: item.count, fill: CHART_COLORS[i % CHART_COLORS.length] }))
  const chartByProvider = (analytics.byProvider || []).slice(0, 8).map((item, i) => ({ name: (item._id || 'Unknown').slice(0, 18), count: item.count, fill: CHART_COLORS[i % CHART_COLORS.length] }))
  const tooltipStyle = { backgroundColor: 'var(--tooltip-bg, #1e293b)', border: '1px solid var(--tooltip-border, #334155)', borderRadius: 8, color: 'var(--tooltip-text, #f1f5f9)', padding: '8px 12px', fontSize: 12 }

  return (
    <DashboardLayout variant="admin">
      <div className="flex flex-col gap-6 overflow-x-hidden min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText size={24} />
              All Claims (Admin)
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              All claims across all users and projects. User email shows who processed each claim.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshClaims} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50" title="Reload all claims">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button onClick={handleReprocess} disabled={reprocessing} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw size={16} className={reprocessing ? 'animate-spin' : ''} />
              Reprocess Claims
            </button>
            <button onClick={handleExportCsv} disabled={exporting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors disabled:opacity-50">
              <Download size={16} />
              {exporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total Claims" value={totalClaims} icon={Database} />
          <MetricCard label="Distinct Providers" value={distinctProviders} icon={Activity} />
          <MetricCard label="Avg Processing Time" value={Math.round(avgDurationSec || 0)} icon={Clock} formatter={(v) => formatDuration(v)} />
        </div>

        <div className="border-b border-slate-200 dark:border-slate-700 flex gap-1">
          {[
            { id: 'table', label: 'Claims Table', icon: FileText },
            { id: 'screenshots', label: 'Screenshots', icon: Eye },
            { id: 'tags', label: 'Tags & OCR', icon: Tag },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-slate-50 dark:bg-slate-800/50'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'table' && (
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <DataTable
              rows={rows}
              columns={columns}
              searchKeys={['claimId', 'reopened', 'userEmail', 'providerName', 'patientName', 'memberId', 'status', 'claimType']}
              onRowClick={async (row) => {
                const found = claims.find(c => c._id === row.id)
                setSelectedClaim(found || null)
                const lookupKey = found?._id ?? found?.claimId ?? found?.ediClaimId
                if (lookupKey) {
                  setLoadingDetail(true)
                  try {
                    const detail = await pmFetchClaimDetail(baseUrl, token, String(lookupKey))
                    setClaimDetail(detail)
                    setSelectedClaimForModal(detail)
                    setShowModal(true)
                  } catch {
                    setSelectedClaimForModal(found)
                    setShowModal(true)
                  } finally {
                    setLoadingDetail(false)
                  }
                } else {
                  setSelectedClaimForModal(found)
                  setShowModal(true)
                }
              }}
            />
            {selectedClaim && (
              <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                    <FileText size={18} />
                    Claim: {selectedClaim.claimId || selectedClaim.ediClaimId || '(unknown)'}
                    {selectedClaim.isReopened && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        {selectedClaim.reopenSequence ? `Reopen #${selectedClaim.reopenSequence}` : 'Reopened'}
                      </span>
                    )}
                  </h3>
                  <button onClick={() => { setSelectedClaim(null); setClaimDetail(null) }} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    <X size={18} />
                  </button>
                </div>
                {(loadingDetail ? selectedClaim : claimDetail || selectedClaim) && (() => {
                  const c = loadingDetail ? selectedClaim : (claimDetail || selectedClaim)
                  return (
                    <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-700 dark:text-slate-300">
                      <div className="space-y-1">
                        {c.userEmail && (
                          <p><span className="font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1"><Mail size={14} /> User email:</span> {c.userEmail}</p>
                        )}
                        <p><span className="font-medium text-slate-500 dark:text-slate-400">Status:</span> {c.status || '—'}</p>
                        <p><span className="font-medium text-slate-500 dark:text-slate-400">Type:</span> {cellValue(c.claimType, 30) || '—'}</p>
                        <p><span className="font-medium text-slate-500 dark:text-slate-400">Provider:</span> {c.providerName || '—'}</p>
                        <p><span className="font-medium text-slate-500 dark:text-slate-400">Patient:</span> {c.patientName || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p><span className="font-medium text-slate-500 dark:text-slate-400">Member ID:</span> {c.memberId || '—'}</p>
                        <p><span className="font-medium text-slate-500 dark:text-slate-400">Received:</span> {c.receivedDate ? new Date(c.receivedDate).toLocaleDateString() : '—'}</p>
                        <p><span className="font-medium text-slate-500 dark:text-slate-400">Processing:</span> {formatDuration(c.processingDurationSec ?? 0)}</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'screenshots' && (
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
            {screenshotItems.length > 0 ? (
              <ScreenshotGallery screenshots={screenshotItems} showSearch onRefresh={refreshScreenshots} authToken={token || undefined} />
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Eye size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">No screenshots with image data yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
            {selectedClaim ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-slate-800 dark:text-slate-100 flex items-center gap-2"><Tag size={16} /> Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedClaim.ocrTags || []).length ? selectedClaim.ocrTags.map(tag => (
                      <span key={tag} className="px-2 py-1 text-xs rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">{tag}</span>
                    )) : <p className="text-sm text-slate-500 dark:text-slate-400">No tags.</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-slate-800 dark:text-slate-100 flex items-center gap-2"><Activity size={16} /> OCR Text</h3>
                  <div className="max-h-64 overflow-y-auto text-xs whitespace-pre-wrap bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-slate-700 dark:text-slate-300">
                    {selectedClaim.ocrText || 'No OCR text stored.'}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">Select a claim in the table to view tags and OCR text.</p>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {chartOverTime.length > 0 && (
              <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2"><Activity size={20} /> Claims over time</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartOverTime}>
                      <defs>
                        <linearGradient id="adminClaimOverTimeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-500 dark:text-slate-400" />
                      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-500 dark:text-slate-400" />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `Month: ${v}`} />
                      <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="url(#adminClaimOverTimeGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2"><BarChart3 size={20} /> By Status</h3>
                <div className="h-64">
                  {chartByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartByStatus} layout="vertical" margin={{ left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                        <XAxis type="number" className="text-xs" stroke="currentColor" />
                        <YAxis type="category" dataKey="name" width={55} className="text-xs" stroke="currentColor" />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">No status data.</div>}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2"><BarChart3 size={20} /> By Type</h3>
                <div className="h-64">
                  {chartByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartByType}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                        <XAxis dataKey="name" className="text-xs" stroke="currentColor" />
                        <YAxis className="text-xs" stroke="currentColor" />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">No type data.</div>}
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2"><BarChart3 size={20} /> Top Providers</h3>
              <div className="h-72">
                {chartByProvider.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={chartByProvider} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {chartByProvider.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">No provider data.</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <ClaimDetailModal
        claim={selectedClaimForModal}
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedClaimForModal(null) }}
        baseUrl={baseUrl}
        authToken={token || ''}
      />
    </DashboardLayout>
  )
}
