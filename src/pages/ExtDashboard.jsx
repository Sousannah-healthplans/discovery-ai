import { useEffect, useState } from 'react'
import { useExtAuth } from '../auth/ExtAuthContext'
import SiteLayout from '../layouts/SiteLayout'
import { Navigate, useNavigate } from 'react-router-dom'
import { Activity, Clock, Camera, MousePointerClick, Calendar, Users, Check, X, Bell, Loader2 } from 'lucide-react'
import { fetchSessions, fetchEvents, fetchScreenshots, fetchOverview, extFetchInvitations, extAcceptInvitation, extRejectInvitation } from '../lib/api'
import { BACKEND_URL } from '../lib/config'

export default function ExtDashboard() {
  const { extUser, logout } = useExtAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [events, setEvents] = useState([])
  const [screenshots, setScreenshots] = useState([])
  const [stats, setStats] = useState({ totalEvents: 0, totalSessions: 0, totalScreenshots: 0, avgSessionDuration: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState(null)
  
  // Team invitation states
  const [invitations, setInvitations] = useState([])
  const [invitationLoading, setInvitationLoading] = useState(null)

  const baseUrl = BACKEND_URL
  const projectId = 'discovery-ai'

  // Fetch invitations
  const loadInvitations = async () => {
    if (!extUser?.token) return
    try {
      const data = await extFetchInvitations(baseUrl, extUser.token)
      setInvitations(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching invitations:', err)
    }
  }

  const handleAcceptInvitation = async (invitationId) => {
    setInvitationLoading(invitationId)
    try {
      await extAcceptInvitation(baseUrl, extUser.token, invitationId)
      setInvitations(prev => prev.filter(inv => inv._id !== invitationId))
      // Optionally refresh the page to reflect the new team status
      window.location.reload()
    } catch (err) {
      console.error('Failed to accept invitation:', err)
    } finally {
      setInvitationLoading(null)
    }
  }

  const handleRejectInvitation = async (invitationId) => {
    setInvitationLoading(invitationId)
    try {
      await extRejectInvitation(baseUrl, extUser.token, invitationId)
      setInvitations(prev => prev.filter(inv => inv._id !== invitationId))
    } catch (err) {
      console.error('Failed to reject invitation:', err)
    } finally {
      setInvitationLoading(null)
    }
  }

  useEffect(() => {
    loadInvitations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extUser])

  useEffect(() => {
    async function load() {
      if (!extUser) return
      
      function handleAuthError(error) {
        if (error && error.status === 401) {
          // Token expired - logout and redirect
          logout()
          navigate('/ext-login', { replace: true })
          return null
        }
        console.error('API error:', error)
        return null
      }
      
      try {
        console.log('Loading dashboard data for user:', extUser.username)
        
        const [sessionsData, eventsData, screenshotsData, overviewData] = await Promise.all([
          fetchSessions(baseUrl, projectId, extUser.token).catch(handleAuthError),
          fetchEvents(baseUrl, projectId, extUser.token).catch(handleAuthError),
          fetchScreenshots(baseUrl, projectId, extUser.token).catch(handleAuthError),
          fetchOverview(baseUrl, projectId, extUser.token).catch(handleAuthError)
        ])

        // Process sessions data
        if (sessionsData) {
          console.log('Sessions data:', sessionsData)
          setSessions(sessionsData || [])
          
          // Calculate stats from sessions
          const totalSessions = (sessionsData || []).length
          const totalEvents = (sessionsData || []).reduce((sum, s) => sum + (s.count || 0), 0)
          
          const avgDuration = totalSessions > 0 
            ? (sessionsData || []).reduce((sum, s) => {
                const duration = s.end && s.start ? (s.end - s.start) / 1000 : 0 // seconds
                return sum + duration
              }, 0) / totalSessions 
            : 0

          setStats(prev => ({
            ...prev,
            totalEvents,
            totalSessions,
            avgSessionDuration: avgDuration
          }))
        }

        // Process events data
        if (eventsData) {
          console.log('Events data:', eventsData?.length || 0, 'events')
          setEvents(eventsData || [])
        }

        // Process screenshots data
        if (screenshotsData) {
          setScreenshots(screenshotsData || [])
          setStats(prev => ({ ...prev, totalScreenshots: (screenshotsData || []).length }))
        }

        // Process overview data for additional stats
        if (overviewData && overviewData.metrics) {
          setStats(prev => ({
            ...prev,
            totalEvents: overviewData.metrics.totalEvents || prev.totalEvents,
            totalSessions: overviewData.metrics.totalSessions || prev.totalSessions,
            totalScreenshots: overviewData.metrics.screenshots || prev.totalScreenshots,
            avgSessionDuration: overviewData.metrics.avgTimeSec || prev.avgSessionDuration
          }))
        }
      } catch (e) {
        console.error('Error loading data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [extUser, baseUrl, logout, navigate])

  if (!extUser) return <Navigate to="/ext-login" replace />

  const formatDuration = (seconds) => {
    if (!seconds) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {extUser.username}!</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your Discovery AI extension activity dashboard
          </p>
        </div>

        {/* Team Invitations */}
        {invitations.length > 0 && (
          <div className="mb-8 space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-amber-400">
              <Bell size={20} />
              Team Invitations ({invitations.length})
            </div>
            {invitations.map((invitation) => (
              <div 
                key={invitation._id} 
                className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <Users size={24} className="text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {invitation.invitedByName || invitation.invitedByEmail || 'A Project Manager'}
                      </h3>
                      <p className="text-slate-400">
                        invited you to join team <span className="text-amber-400 font-medium">{invitation.projectId}</span>
                      </p>
                      {invitation.message && (
                        <p className="text-sm text-slate-500 mt-1 italic">"{invitation.message}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-shrink-0">
                    <button
                      onClick={() => handleRejectInvitation(invitation._id)}
                      disabled={invitationLoading === invitation._id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {invitationLoading === invitation._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <X size={16} />
                      )}
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptInvitation(invitation._id)}
                      disabled={invitationLoading === invitation._id}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {invitationLoading === invitation._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <div className="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="text-cyan-500" size={24} />
              <div>
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Events</div>
              </div>
            </div>
          </div>
          <div className="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-blue-500" size={24} />
              <div>
                <div className="text-2xl font-bold">{stats.totalSessions}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Sessions</div>
              </div>
            </div>
          </div>
          <div className="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Camera className="text-orange-500" size={24} />
              <div>
                <div className="text-2xl font-bold">{screenshots.length}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Screenshots</div>
              </div>
            </div>
          </div>
          <div className="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-purple-500" size={24} />
              <div>
                <div className="text-2xl font-bold">{formatDuration(stats.avgSessionDuration)}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Avg Session</div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading your data...</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sessions List */}
            <div className="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Recent Sessions
              </h2>
              {sessions.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  No sessions recorded yet. Start browsing to see your activity!
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sessions.map((s) => (
                    <div
                      key={s._id}
                      onClick={() => setSelectedSession(s)}
                      className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                        selectedSession?._id === s._id
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">Session {s._id?.slice(0, 8) || 'Unknown'}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {formatDate(s.start)} - {formatDate(s.end)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MousePointerClick size={14} />
                          <span>{s.count || 0} events</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        Duration: {formatDuration((s.end - s.start) / 1000)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Events */}
            <div className="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity size={20} />
                Recent Events
              </h2>
              {events.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  No events recorded yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {events.slice(0, 20).map((e, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 dark:border-white/10 p-3 text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{e.type || 'unknown'}</div>
                          {e.data && typeof e.data === 'object' && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {JSON.stringify(e.data).slice(0, 100)}...
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                          {formatDate(e.ts)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Screenshots Section */}
        {screenshots.length > 0 && (
          <div className="mt-6 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Camera size={20} />
              Screenshots ({screenshots.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {screenshots.slice(0, 9).map((s, idx) => {
                // Construct screenshot URL - Priority: cloudinaryUrl > screenshotFilename > dataUrl
                let screenshotUrl = '';
                if (s.data?.cloudinaryUrl) {
                  screenshotUrl = s.data.cloudinaryUrl;
                } else if (s.data?.screenshotFilename) {
                  screenshotUrl = `${baseUrl}/screenshots/${s.data.screenshotFilename}`;
                } else if (s.data?.dataUrl) {
                  screenshotUrl = s.data.dataUrl;
                }
                
                return (
                  <div key={idx} className="rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                    {screenshotUrl ? (
                      <img
                        src={screenshotUrl}
                        alt={`Screenshot ${idx + 1}`}
                        className="w-full h-auto"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400" style={{ display: screenshotUrl ? 'none' : 'block' }}>
                      {s.data?.screenshotFilename ? `Screenshot: ${s.data.screenshotFilename}` : 'No image data'}
                    </div>
                    <div className="p-2 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(s.ts)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  )
}
