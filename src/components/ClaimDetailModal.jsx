import { useState, useEffect } from 'react'
import { X, FileText, User, Building2, Calendar, DollarSign, ChevronDown, ChevronRight, ImageIcon } from 'lucide-react'

export default function ClaimDetailModal({ claim, isOpen, onClose, baseUrl = '', authToken = '' }) {
  const [expandedOcrIndex, setExpandedOcrIndex] = useState(null)
  const [expandedImageIndex, setExpandedImageIndex] = useState(null)
  const [proxyUrls, setProxyUrls] = useState({})
  useEffect(() => {
    if (!isOpen || !claim?.screenshots?.length || !baseUrl || !authToken) return
    const ids = claim.screenshots.map((s) => s.screenshotEventId?.toString()).filter(Boolean)
    let cancelled = false
    const next = {}
    ids.forEach((eventId) => {
      const url = `${baseUrl.replace(/\/$/, '')}/api/pm/screenshots/${eventId}/image`
      fetch(url, { headers: { Authorization: `Bearer ${authToken}` }, credentials: 'include' })
        .then((r) => (r.ok ? r.blob() : null))
        .then((blob) => {
          if (cancelled || !blob) return
          next[eventId] = URL.createObjectURL(blob)
          setProxyUrls((p) => ({ ...p, ...next }))
        })
        .catch(() => {})
    })
    return () => {
      cancelled = true
      Object.values(next).forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) {} })
    }
  }, [isOpen, claim?.screenshots, baseUrl, authToken])
  if (!isOpen || !claim) return null

  const formatDate = (date) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString()
    } catch {
      return String(date)
    }
  }

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0))
    const mins = Math.floor(total / 60)
    const secs = total % 60
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const serviceDetails = claim.allServiceDetails || claim.serviceDetails || []
  const totalBilled = serviceDetails.reduce((sum, s) => sum + (Number(s.billedAmount) || 0), 0)
  const totalAllowed = serviceDetails.reduce((sum, s) => sum + (Number(s.allowedAmount) || 0), 0)
  const adjudication = claim.allAdjudication || claim.adjudication || {}
  const screenshots = claim.screenshots || []

  const getScreenshotImageSrc = (s) => {
    const eventId = s.screenshotEventId?.toString()
    if (eventId && proxyUrls[eventId]) return proxyUrls[eventId]
    return s.imageUrl
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText size={24} className="text-emerald-500 dark:text-emerald-400" />
              Claim: {claim.claimId || '(Unknown)'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {claim.docType || 'unknown'} • {claim.origin || 'unknown'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <section className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                <FileText size={18} />
                Claim Information
              </h3>
              <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-700 dark:text-slate-300">
                <div><span className="text-slate-500 dark:text-slate-400">Claim ID:</span> <span className="font-mono ml-1">{claim.claimId || '—'}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">Status:</span> <span className="ml-1">{claim.status || '—'}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">Type:</span> <span className="ml-1">{claim.claimType || 'Unknown'}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">Priority:</span> <span className="ml-1">{claim.priority || '—'}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">Assigned To:</span> <span className="ml-1">{claim.assignedTo || '—'}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">Received:</span> <span className="ml-1">{formatDate(claim.receivedDate)}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">Processing Time:</span> <span className="ml-1 font-medium">{formatDuration(claim.processingDurationSec ?? 0)}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">First / Last Seen:</span> <span className="ml-1 text-xs">{claim.firstSeenTs ? new Date(claim.firstSeenTs).toLocaleString() : '—'} / {claim.lastSeenTs ? new Date(claim.lastSeenTs).toLocaleString() : '—'}</span></div>
              </div>
            </section>

            <section className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                <User size={18} />
                Patient Information
              </h3>
              <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-700 dark:text-slate-300">
                <div><span className="text-slate-500 dark:text-slate-400">Patient Name:</span> <span className="ml-1">{claim.patientName || '—'}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">DOB:</span> <span className="ml-1">{formatDate(claim.dob)}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">Member ID:</span> <span className="ml-1 font-mono">{claim.memberId || '—'}</span></div>
              </div>
            </section>

            <section className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                <Building2 size={18} />
                Provider
              </h3>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Provider Name:</span> <span className="ml-1">{claim.providerName || '—'}</span>
              </div>
            </section>

            {serviceDetails.length > 0 && (
              <section className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Calendar size={18} />
                  Service Details ({serviceDetails.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-600">
                        <th className="text-left p-2 text-slate-500 dark:text-slate-400">Date</th>
                        <th className="text-left p-2 text-slate-500 dark:text-slate-400">CPT Code</th>
                        <th className="text-left p-2 text-slate-500 dark:text-slate-400">Description</th>
                        <th className="text-right p-2 text-slate-500 dark:text-slate-400">Billed</th>
                        <th className="text-right p-2 text-slate-500 dark:text-slate-400">Allowed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceDetails.map((s, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-700">
                          <td className="p-2 text-slate-700 dark:text-slate-300">{s.serviceDate || '—'}</td>
                          <td className="p-2 font-mono text-slate-700 dark:text-slate-300">{s.cptCode || '—'}</td>
                          <td className="p-2 text-slate-700 dark:text-slate-300">{s.description || '—'}</td>
                          <td className="p-2 text-right text-slate-700 dark:text-slate-300">{s.billedAmount != null ? `$${Number(s.billedAmount).toFixed(2)}` : '—'}</td>
                          <td className="p-2 text-right text-slate-700 dark:text-slate-300">{s.allowedAmount != null ? `$${Number(s.allowedAmount).toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 dark:border-slate-600 font-medium">
                        <td className="p-2 text-slate-500 dark:text-slate-400" colSpan={3}>Total</td>
                        <td className="p-2 text-right text-slate-900 dark:text-white">${totalBilled.toFixed(2)}</td>
                        <td className="p-2 text-right text-slate-900 dark:text-white">${totalAllowed.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {adjudication && Object.keys(adjudication).length > 0 && (
              <section className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                  <DollarSign size={18} />
                  Adjudication
                </h3>
                <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-700 dark:text-slate-300">
                  {adjudication.billedAmount != null && <div><span className="text-slate-500 dark:text-slate-400">Billed:</span> <span className="ml-1">${Number(adjudication.billedAmount).toFixed(2)}</span></div>}
                  {adjudication.allowedAmount != null && <div><span className="text-slate-500 dark:text-slate-400">Allowed:</span> <span className="ml-1">${Number(adjudication.allowedAmount).toFixed(2)}</span></div>}
                  {adjudication.deductible != null && <div><span className="text-slate-500 dark:text-slate-400">Deductible:</span> <span className="ml-1">${Number(adjudication.deductible).toFixed(2)}</span></div>}
                  {adjudication.payableAmount != null && <div><span className="text-slate-500 dark:text-slate-400">Payable:</span> <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">${Number(adjudication.payableAmount).toFixed(2)}</span></div>}
                </div>
              </section>
            )}

            {screenshots.length > 0 && (
              <section className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                  <ImageIcon size={18} />
                  Screens &amp; OCR ({screenshots.length})
                </h3>
                <div className="space-y-3">
                  {screenshots.map((s, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => setExpandedOcrIndex(expandedOcrIndex === idx ? null : idx)}
                        className="w-full p-3 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-100">{s.docType || 'screen'}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm">{s.origin || '—'}</span>
                        <span className="text-slate-400 dark:text-slate-500 text-xs">{s.firstSeenTs ? new Date(s.firstSeenTs).toLocaleString() : ''}</span>
                        {expandedOcrIndex === idx ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <div className="flex flex-col sm:flex-row gap-3 p-3 border-t border-slate-200 dark:border-slate-600">
                        {(getScreenshotImageSrc(s) || s.imageUrl) && (
                          <div className="flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setExpandedImageIndex(expandedImageIndex === idx ? null : idx)}
                              className="block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 max-w-[200px] hover:ring-2 ring-emerald-500 dark:ring-emerald-400"
                            >
                              <img
                                src={getScreenshotImageSrc(s) || s.imageUrl}
                                alt={`Screenshot ${idx + 1}`}
                                className="w-full h-28 object-cover bg-slate-100 dark:bg-slate-800"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }}
                              />
                              <div className="hidden w-full h-28 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                                Image unavailable
                              </div>
                            </button>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Click to expand</p>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {s.sourceUrl && <div className="text-xs text-slate-500 dark:text-slate-400 break-all mb-1">URL: {s.sourceUrl}</div>}
                          {expandedOcrIndex === idx && s.ocrText && (
                            <pre className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono p-2 bg-slate-100 dark:bg-slate-800 rounded">
                              {s.ocrText}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {expandedImageIndex !== null && (getScreenshotImageSrc(screenshots[expandedImageIndex]) || screenshots[expandedImageIndex]?.imageUrl) && (
                  <div
                    className="fixed inset-0 z-[60] bg-black/80 dark:bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setExpandedImageIndex(null)}
                  >
                    <img
                      src={getScreenshotImageSrc(screenshots[expandedImageIndex]) || screenshots[expandedImageIndex].imageUrl}
                      alt="Screenshot full size"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={() => setExpandedImageIndex(null)}
                      className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                      <X size={24} />
                    </button>
                  </div>
                )}
              </section>
            )}

            {claim.sourceUrl && (
              <section className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-2 text-slate-800 dark:text-slate-100">Source URL</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 break-all">{claim.sourceUrl}</div>
              </section>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
