import { useParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import MetricCard from '../../components/MetricCard';
import { useEffect, useState } from 'react';
import { 
  adminFetchUsers,
  adminFetchUserOverview, 
  adminFetchUserSessions, 
  adminFetchUserEvents,
  adminFetchUserScreenshots
} from '../../lib/api';
import ScreenshotGallery from '../../components/ScreenshotGallery';
import SessionTimeline from '../../components/SessionTimeline';
import SessionAnalytics from '../../components/SessionAnalytics';
import InputTracking from '../../components/InputTracking';
import { BACKEND_URL } from '../../lib/config';
import { 
  Activity, 
  Clock, 
  Camera, 
  MousePointerClick,
  Search,
  Eye,
  Calendar,
  XCircle,
  TrendingUp,
  Users,
  BarChart3,
  PieChart,
  Keyboard,
  Globe
} from 'lucide-react';
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
  Area,
  AreaChart,
  Legend
} from 'recharts';

export default function AdminClientDetail() {
  const { id } = useParams(); // id is userId (trackerUserId)
  const [user, setUser] = useState(null)
  const [overview, setOverview] = useState({ 
    totalSessions: 0, 
    avgTimeSec: 0, 
    screenshots: 0,
    totalEvents: 0
  })
  const [sessions, setSessions] = useState([])
  const [events, setEvents] = useState([])
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('analytics')
  const [eventFilter, setEventFilter] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const [screenshotPage, setScreenshotPage] = useState(1)
  const screenshotsPerPage = 20
  const [sessionDetails, setSessionDetails] = useState({
    events: [],
    screenshots: [],
    tabs: [],
    stats: {
      totalEvents: 0,
      duration: 0,
      pageViews: 0,
      interactions: 0,
      screenshots: 0,
      tabs: 0
    }
  })
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionModalTab, setSessionModalTab] = useState('overview') // 'overview', 'timeline', 'screenshots', 'tabs'
  const [analyticsData, setAnalyticsData] = useState({
    hourlyActivity: [],
    dailyActivity: [],
    eventTypes: [],
    sessionDuration: [],
    userActivity: []
  })
  
  const baseUrl = BACKEND_URL
  const token = localStorage.getItem('authToken') || ''

  useEffect(() => {
    if (!baseUrl || !token || !id) return
    
    setLoading(true)
    Promise.all([
      adminFetchUsers(baseUrl, token).then(list => {
        const u = list.find(x => x.userId === id)
        setUser(u || { userId: id })
      }),
      adminFetchUserOverview(baseUrl, id, token).then(setOverview),
      adminFetchUserSessions(baseUrl, id, token, 1000).then(setSessions),
      adminFetchUserEvents(baseUrl, id, token, undefined, 500).then(setEvents),
      // Use admin-specific screenshot fetching for the viewed user
      adminFetchUserScreenshots(baseUrl, id, token, 1000).then(shots => {
        console.log('[AdminClientDetail] Fetched screenshots for user:', id, 'count:', shots?.length || 0)
        setScreenshots(shots || [])
      })
    ]).catch((err) => {
      console.error('[AdminClientDetail] Error fetching data:', err)
    }).finally(() => setLoading(false))
  }, [baseUrl, token, id])

  // Process analytics data when events and sessions change
useEffect(() => {
  const hasOverviewTypes = Object.keys(overview?.byType || {}).length > 0
  if (events.length === 0 && sessions.length === 0 && !hasOverviewTypes) return

    const processAnalyticsData = () => {
      // Hourly activity (last 24 hours)
      const now = new Date()
      const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000)
        const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours())
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
        
        const eventsInHour = events.filter(e => {
          const eventTime = new Date(e.ts)
          return eventTime >= hourStart && eventTime < hourEnd
        }).length
        
        return {
          hour: hour.getHours(),
          time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          events: eventsInHour
        }
      })

      // Daily activity (last 7 days)
      const dailyData = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        
        const eventsInDay = events.filter(e => {
          const eventTime = new Date(e.ts)
          return eventTime >= dayStart && eventTime < dayEnd
        }).length
        
        const sessionsInDay = sessions.filter(s => {
          const sessionTime = new Date(s.start)
          return sessionTime >= dayStart && sessionTime < dayEnd
        }).length
        
        return {
          day: day.toLocaleDateString('en-US', { weekday: 'short' }),
          date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          events: eventsInDay,
          sessions: sessionsInDay
        }
      })

      // Event types distribution
    const eventTypeCounts = hasOverviewTypes
      ? overview.byType
      : events.reduce((acc, event) => {
          acc[event.type] = (acc[event.type] || 0) + 1
          return acc
        }, {})
    const totalEventTypeCount = Object.values(eventTypeCounts).reduce((sum, count) => sum + count, 0)
      
      const eventTypes = Object.entries(eventTypeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalEventTypeCount ? ((count / totalEventTypeCount) * 100).toFixed(1) : '0.0'
      }))
        .sort((a, b) => b.count - a.count)

      // Session duration distribution
      const durationRanges = [
        { range: '0-30s', min: 0, max: 30, count: 0 },
        { range: '30s-1m', min: 30, max: 60, count: 0 },
        { range: '1-5m', min: 60, max: 300, count: 0 },
        { range: '5-15m', min: 300, max: 900, count: 0 },
        { range: '15m+', min: 900, max: Infinity, count: 0 }
      ]
      
      sessions.forEach(session => {
        const duration = session.durationSec || 0
        const range = durationRanges.find(r => duration >= r.min && duration < r.max)
        if (range) range.count++
      })

      // User activity (top users by event count)
      const userActivity = events.reduce((acc, event) => {
        const userId = event.userId || 'Anonymous'
        if (!acc[userId]) {
          acc[userId] = { userId, events: 0, lastActivity: event.ts }
        }
        acc[userId].events++
        if (new Date(event.ts) > new Date(acc[userId].lastActivity)) {
          acc[userId].lastActivity = event.ts
        }
        return acc
      }, {})
      
      const topUsers = Object.values(userActivity)
        .sort((a, b) => b.events - a.events)
        .slice(0, 10)

      setAnalyticsData({
        hourlyActivity: hourlyData,
        dailyActivity: dailyData,
        eventTypes,
        sessionDuration: durationRanges,
        userActivity: topUsers
      })
    }

    processAnalyticsData()
  }, [events, sessions, overview])

  const formatDuration = (seconds) => {
    if (!seconds) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const sessionColumns = [
    { key: 'sessionId', header: 'Session ID' },
    { key: 'userId', header: 'User ID' },
    { key: 'eventCount', header: 'Events' },
    { key: 'startTime', header: 'Start Time' },
    { key: 'endTime', header: 'End Time' },
    { key: 'durationSec', header: 'Duration' },
    { key: 'actions', header: 'Actions', render: (v, r) => (
      <button
        onClick={() => handleViewSession(r.sessionId)}
        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors flex items-center gap-1"
      >
        <Eye size={14} />
        View
      </button>
    )},
  ]


  const handleViewSession = async (sessionId) => {
    setSelectedSession(sessionId)
    setSessionLoading(true)
    setSessionModalTab('overview') // Reset to overview tab when opening
    
    try {
      // Fetch events and screenshots for this specific session (using admin APIs)
      const [eventsList, screenshotsList] = await Promise.all([
        adminFetchUserEvents(baseUrl, id, token, undefined, 500),
        adminFetchUserScreenshots(baseUrl, id, token, 500)
      ])

      // Get all events for this session (including for tabs processing)
      const allSessionEvents = eventsList.filter(e => e.sessionId === sessionId)
      
      // Process events for timeline (excluding screenshots)
      const sessionEvents = allSessionEvents.filter(e => e.type !== 'screenshot')
      const timeline = sessionEvents.map(e => {
        let label = '';
        if (e.data) {
          const el = e.data.element;
          if (el) {
            label = el.ariaLabel || el.name || el.placeholder || el.id || el.text || '';
            if (!label && el.tag) label = `<${el.tag}>`;
          }
          if (!label) {
            label = e.data.selector || e.data.path || e.data.label || e.data.title || e.data.url || '';
          }
        }
        return {
          id: String(e._id || `${e.sessionId}_${e.ts}`),
          type: e.type,
          label,
          ts: new Date(e.ts).toISOString(),
          data: e.data
        };
      })

      // Process screenshots for this session
      const shots = screenshotsList.filter(s => s.sessionId === sessionId).map((s, idx) => {
        const eventData = s.data || {};
        let screenshotUrl = '';
        
        // Priority: cloudinaryUrl > screenshotFilename > dataUrl > url
        if (eventData.cloudinaryUrl) {
          screenshotUrl = eventData.cloudinaryUrl;
        } else if (eventData.screenshotFilename) {
          const cleanBaseUrl = baseUrl.replace(/\/$/, '');
          screenshotUrl = `${cleanBaseUrl}/screenshots/${eventData.screenshotFilename}`;
        } else if (eventData.dataUrl) {
          screenshotUrl = eventData.dataUrl;
        } else if (eventData.url) {
          screenshotUrl = eventData.url;
        }
        
        return {
          id: `${s._id || s.sessionId}_${idx}`,
          _id: s._id, // Keep original MongoDB ID for OCR processing
          sessionId: s.sessionId,
          url: screenshotUrl,
          device: eventData.device || 'Unknown',
          browser: eventData.browser || 'Unknown',
          country: eventData.country || 'Unknown',
          timestamp: new Date(s.ts).toISOString(),
          duration: 0,
          fileSizeKB: eventData.fileSizeKB || null,
          // OCR data - directly from the event record
          ocrText: s.ocrText || null,
          ocrTags: s.ocrTags || [],
          ocrProcessed: s.ocrProcessed || false,
          data: s.data
        };
      }).filter(shot => shot.url && shot.url.length > 0)

      // Process tabs for this session
      const tabMap = new Map();
      const urlToKey = new Map();
      const sortedEvents = [...allSessionEvents].sort((a, b) => 
        new Date(a.ts).getTime() - new Date(b.ts).getTime()
      );
      
      let currentActiveTabId = null;
      
      // Process all events to build tabs
      sortedEvents.forEach(e => {
        let url = e.data?.url || e.url || e.data?.path || null;
        let title = e.data?.title || e.title || null;
        let tabId = e.data?.tabId || e.tabId || null;
        const ts = new Date(e.ts).getTime();
        
        // Skip invalid URLs
        if (url && (url === 'chrome://' || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:'))) {
          url = null;
        }
        
        // Generate a key - use tabId if available, otherwise use URL
        let key = tabId;
        if (!key && url) {
          if (urlToKey.has(url)) {
            key = urlToKey.get(url);
          } else {
            key = `url_${url}`;
            urlToKey.set(url, key);
          }
        }
        
        if (!key) return;
        
        if (tabId && url) {
          urlToKey.set(url, tabId);
        }
        
        if (!tabMap.has(key)) {
          tabMap.set(key, {
            tabId: key,
            url: url || 'Unknown URL',
            title: title || 'Untitled',
            created: ts,
            lastUpdated: ts,
            activations: 0,
            totalActiveMs: 0,
            activeStart: null,
            events: []
          });
        }
        
        const tab = tabMap.get(key);
        tab.lastUpdated = Math.max(tab.lastUpdated, ts);
        if (url && url !== 'Unknown URL') tab.url = url;
        if (title && title !== 'Untitled') tab.title = title;
        tab.events.push({ type: e.type, ts });
        
        if (e.type === 'tab_activated') {
          if (currentActiveTabId && currentActiveTabId !== key) {
            const prevTab = tabMap.get(currentActiveTabId);
            if (prevTab && prevTab.activeStart !== null) {
              prevTab.totalActiveMs += ts - prevTab.activeStart;
              prevTab.activeStart = null;
            }
          }
          tab.activations++;
          tab.activeStart = ts;
          currentActiveTabId = key;
        } else if (e.type === 'tab_deactivated' || e.type === 'tab_removed') {
          if (tab.activeStart !== null) {
            tab.totalActiveMs += ts - tab.activeStart;
            tab.activeStart = null;
          }
          if (currentActiveTabId === key) {
            currentActiveTabId = null;
          }
        } else if (e.type === 'window_blur' || e.type === 'visibility_change') {
          tabMap.forEach(t => {
            if (t.activeStart !== null) {
              t.totalActiveMs += ts - t.activeStart;
              t.activeStart = null;
            }
          });
          currentActiveTabId = null;
        }
      });
      
      // Close any still-active tabs at session end
      const sessionEnd = sessionEvents.length > 0 
        ? Math.max(...sessionEvents.map(e => new Date(e.ts).getTime()))
        : Date.now();
      
      tabMap.forEach(tab => {
        if (tab.activeStart !== null) {
          const duration = sessionEnd - tab.activeStart;
          tab.totalActiveMs += Math.min(duration, 5 * 60 * 1000);
          tab.activeStart = null;
        }
        if (tab.activations > 0 && tab.totalActiveMs === 0) {
          tab.totalActiveMs = tab.activations * 1000;
        }
      });
      
      const sessionTabs = Array.from(tabMap.values())
        .filter(tab => {
          const hasValidUrl = tab.url && 
            tab.url !== 'Unknown URL' && 
            !tab.url.startsWith('chrome://') && 
            !tab.url.startsWith('chrome-extension://');
          return hasValidUrl;
        })
        .sort((a, b) => b.lastUpdated - a.lastUpdated);

      // Calculate session statistics with robust typing
      const timeValues = sessionEvents.map(e => new Date(e.ts).getTime()).filter(v => Number.isFinite(v))
      const pageViewTypes = new Set(['page_view', 'pageview', 'route_change', 'navigation'])
      const interactionTypes = new Set(['click', 'button_click', 'input', 'form_submit', 'keydown', 'keyup', 'change'])
      const stats = {
        totalEvents: timeline.length,
        duration: timeValues.length > 0 ? Math.round((Math.max(...timeValues) - Math.min(...timeValues)) / 1000) : 0,
        pageViews: timeline.filter(e => pageViewTypes.has(e.type)).length,
        interactions: timeline.filter(e => interactionTypes.has(e.type)).length,
        screenshots: shots.length,
        tabs: sessionTabs.length
      }

      setSessionDetails({
        events: timeline,
        screenshots: shots,
        tabs: sessionTabs,
        stats
      })
    } catch (error) {
      console.error('Error fetching session details:', error)
    } finally {
      setSessionLoading(false)
    }
  }

  const handleCloseSessionDetail = () => {
    setSelectedSession(null)
    setSessionModalTab('overview')
    setSessionDetails({
      events: [],
      screenshots: [],
      tabs: [],
      stats: {
        totalEvents: 0,
        duration: 0,
        pageViews: 0,
        interactions: 0,
        screenshots: 0,
        tabs: 0
      }
    })
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = !eventFilter || 
      event.sessionId?.toLowerCase().includes(eventFilter.toLowerCase()) ||
      event.type?.toLowerCase().includes(eventFilter.toLowerCase()) ||
      (event.data?.selector || event.data?.path || event.data?.label || event.data?.text || '').toLowerCase().includes(eventFilter.toLowerCase())
    
    const matchesType = !eventTypeFilter || event.type === eventTypeFilter
    
    return matchesSearch && matchesType
  })

  const eventTypes = [...new Set(events.map(e => e.type))].filter(Boolean)

  if (loading) {
    return (
      <DashboardLayout variant="admin">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading client details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout variant="admin">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {user?.username || user?.email || `User ${id?.slice(0, 12)}`}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {user?.email && <span>{user.email} • </span>}
          Browser Extension • User ID: {id}
        </p>
      </div>

      {/* Analytics Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <MetricCard 
          label="Total Sessions" 
          value={overview.totalSessions} 
          icon={Activity}
        />
        <MetricCard 
          label="Avg Duration" 
          value={formatDuration(overview.avgTimeSec)} 
          icon={Clock}
        />
        <MetricCard 
          label="Screenshots" 
          value={overview.screenshots} 
          icon={Camera}
        />
        <MetricCard 
          label="Total Events" 
          value={overview.totalEvents || events.length} 
          icon={MousePointerClick}
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
          {[
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'sessions', label: 'Sessions', icon: Activity },
            { id: 'events', label: 'Events', icon: MousePointerClick },
            { id: 'screenshots', label: 'Screenshots', icon: Camera }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Activity Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Hourly Activity */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock size={20} />
                Hourly Activity (Last 24h)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.hourlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9ca3af"
                      fontSize={12}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f9fafb'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="events" 
                      stroke="#06b6d4" 
                      fill="#06b6d4" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Activity */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Daily Activity (Last 7 days)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f9fafb'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="events" fill="#06b6d4" name="Events" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Event Types and Session Duration */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Event Types Distribution */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart size={20} />
                Event Types Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData.eventTypes.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.eventTypes.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#84cc16', '#f97316'][index % 8]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f9fafb'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Session Duration Distribution */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Session Duration Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.sessionDuration}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="range" 
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f9fafb'
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* User Activity */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users size={20} />
              Session Activity
              </h3>
              <div className="space-y-3">
              {analyticsData.userActivity.slice(0, 10).map((activityUser, index) => {
                // Find the full user data for this userId
                const fullUserData = user && activityUser.userId === user.userId ? user : null
                const displayName = fullUserData?.username || fullUserData?.email || activityUser.userId?.slice(0, 12)
                
                return (
                  <div key={activityUser.userId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{displayName}</div>
                        {fullUserData?.email && fullUserData.email !== displayName && (
                          <div className="text-xs text-slate-400">{fullUserData.email}</div>
                        )}
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Last active: {formatDate(activityUser.lastActivity)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-cyan-600 dark:text-cyan-400">{activityUser.events}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">events</div>
                    </div>
                  </div>
                )
              })}
                {analyticsData.userActivity.length === 0 && (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No user activity data available
                </div>
              )}
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Key Insights
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Peak Activity Hour</div>
                <div className="text-lg font-semibold">
                  {analyticsData.hourlyActivity.reduce((max, hour) => 
                    hour.events > max.events ? hour : max, 
                    { events: 0, time: 'N/A' }
                  ).time}
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Most Common Event</div>
                <div className="text-lg font-semibold">
                  {analyticsData.eventTypes[0]?.type || 'N/A'}
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Avg Session Duration</div>
                <div className="text-lg font-semibold">
                  {formatDuration(overview.avgTimeSec)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Activity size={20} />
            Sessions ({sessions.length})
          </h3>
            {user && (
              <div className="text-sm text-slate-400 space-y-1">
                <div>User: <span className="text-slate-200">{user.username || `User ${user.userId?.slice(0, 12)}`}</span></div>
                {user.email && <div>Email: <span className="text-slate-200">{user.email}</span></div>}
                <div>User ID: <code className="bg-slate-800 px-1 rounded text-xs">{user.userId}</code></div>
              </div>
            )}
          </div>
          <DataTable 
            rows={sessions.map(s => ({
              id: s.sessionId,
              sessionId: s.sessionId,
              userId: s.userId || 'Anonymous',
              eventCount: s.count || 0,
              startTime: s.start ? formatDate(s.start) : 'Unknown',
              endTime: s.end ? formatDate(s.end) : 'Unknown',
              durationSec: formatDuration(s.durationSec || 0)
            }))} 
            columns={sessionColumns} 
            searchKeys={["sessionId","userId","startTime","endTime"]} 
          />
        </div>
      )}

      {/* Screenshots Tab */}
      {activeTab === 'screenshots' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Camera size={20} />
              Screenshots ({screenshots.length})
            </h3>
            {user && (
              <div className="text-sm text-slate-400 space-y-1">
                <div>User: <span className="text-slate-200">{user.username || `User ${user.userId?.slice(0, 12)}`}</span></div>
                {user.email && <div>Email: <span className="text-slate-200">{user.email}</span></div>}
                <div>User ID: <code className="bg-slate-800 px-1 rounded text-xs">{user.userId}</code></div>
              </div>
            )}
          </div>
          
          {screenshots.length > 0 ? (
            <>
              {/* Screenshot Gallery with search and tags */}
              <div className="mb-4">
                <ScreenshotGallery 
                  screenshots={screenshots
                    .map((s, idx) => {
                      const eventData = s.data || {};
                      let screenshotUrl = '';
                      
                      // Priority: cloudinaryUrl > screenshotFilename > dataUrl > url
                      if (eventData.cloudinaryUrl) {
                        screenshotUrl = eventData.cloudinaryUrl;
                      } else if (eventData.screenshotFilename) {
                        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
                        screenshotUrl = `${cleanBaseUrl}/screenshots/${eventData.screenshotFilename}`;
                      } else if (eventData.dataUrl) {
                        screenshotUrl = eventData.dataUrl;
                      } else if (eventData.url) {
                        screenshotUrl = eventData.url;
                      }
                      
                      return {
                        id: `${s._id || s.sessionId}_${idx}`,
                        _id: s._id, // Keep original MongoDB ID for OCR processing
                        sessionId: s.sessionId,
                        url: screenshotUrl,
                        device: eventData.device || 'Unknown',
                        browser: eventData.browser || 'Unknown',
                        country: eventData.country || 'Unknown',
                        timestamp: new Date(s.ts).toISOString(),
                        duration: 0,
                        fileSizeKB: eventData.fileSizeKB || null,
                        // OCR data - directly from the event record
                        ocrText: s.ocrText || null,
                        ocrTags: s.ocrTags || [],
                        ocrProcessed: s.ocrProcessed || false,
                        data: s.data
                      };
                    })
                    .filter(shot => shot.url && shot.url.length > 0)
                    .slice((screenshotPage - 1) * screenshotsPerPage, screenshotPage * screenshotsPerPage)
                  }
                  showSearch={true}
                  onRefresh={() => {
                    // Refetch screenshots after OCR processing
                    adminFetchUserScreenshots(baseUrl, id, token, 1000).then(shots => {
                      console.log('[AdminClientDetail] Refreshed screenshots after OCR:', shots?.length || 0)
                      setScreenshots(shots || [])
                    }).catch(err => console.error('Failed to refresh screenshots:', err))
                  }}
                />
              </div>
              
              {/* Pagination */}
              {screenshots.filter(s => {
                const eventData = s.data || {};
                return eventData.cloudinaryUrl || eventData.screenshotFilename || eventData.dataUrl || eventData.url;
              }).length > screenshotsPerPage && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                  <div className="text-sm text-slate-400">
                    Showing {(screenshotPage - 1) * screenshotsPerPage + 1} to {Math.min(screenshotPage * screenshotsPerPage, screenshots.length)} of {screenshots.length} screenshots
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setScreenshotPage(p => Math.max(1, p - 1))}
                      disabled={screenshotPage === 1}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-400">
                      Page {screenshotPage} of {Math.ceil(screenshots.length / screenshotsPerPage)}
                    </span>
                    <button
                      onClick={() => setScreenshotPage(p => Math.min(Math.ceil(screenshots.length / screenshotsPerPage), p + 1))}
                      disabled={screenshotPage >= Math.ceil(screenshots.length / screenshotsPerPage)}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Camera size={48} className="mx-auto mb-4 opacity-50" />
              <p>No screenshots available for this user</p>
            </div>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MousePointerClick size={20} />
              Recent Events ({filteredEvents.length})
            </h3>
            <div className="flex gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                />
              </div>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
              >
                <option value="">All Types</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {filteredEvents.slice(0, 100).map(event => (
                <div key={event._id} className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs rounded">
                          {event.type}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(event.ts)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Session: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">{event.sessionId}</code>
                      </div>
                      <div className="text-sm">
                        {event.data?.selector && (
                          <div className="mb-1">
                            <span className="text-slate-500 dark:text-slate-500">Selector:</span> 
                            <code className="ml-1 bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">{event.data.selector}</code>
                          </div>
                        )}
                        {event.data?.path && (
                          <div className="mb-1">
                            <span className="text-slate-500 dark:text-slate-500">Path:</span> 
                            <span className="ml-1">{event.data.path}</span>
                          </div>
                        )}
                        {event.data?.text && (
                          <div className="mb-1">
                            <span className="text-slate-500 dark:text-slate-500">Text:</span> 
                            <span className="ml-1">{event.data.text}</span>
                          </div>
                        )}
                        {event.data?.label && (
                          <div className="mb-1">
                            <span className="text-slate-500 dark:text-slate-500">Label:</span> 
                            <span className="ml-1">{event.data.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  Session Details
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Session ID: <span className="font-mono text-cyan-400">{selectedSession}</span>
                </p>
              </div>
              <button
                onClick={handleCloseSessionDetail}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <XCircle size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-4 flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
              <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
                {[
                  { id: 'overview', label: 'Overview', icon: Activity },
                  { id: 'timeline', label: 'Timeline', icon: Clock },
                  { id: 'screenshots', label: `Screenshots (${sessionDetails.stats.screenshots})`, icon: Camera },
                  { id: 'tabs', label: `Tabs (${sessionDetails.stats.tabs})`, icon: Globe }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSessionModalTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      sessionModalTab === tab.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-6">
              {sessionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Loading session details...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Overview Tab */}
                  {sessionModalTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Session Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <MetricCard 
                          label="Total Events" 
                          value={sessionDetails.stats.totalEvents}
                          icon={Activity}
                        />
                        <MetricCard 
                          label="Duration" 
                          value={`${Math.floor(sessionDetails.stats.duration / 60)}m ${sessionDetails.stats.duration % 60}s`}
                          icon={Clock}
                        />
                        <MetricCard 
                          label="Page Views" 
                          value={sessionDetails.stats.pageViews}
                          icon={Eye}
                        />
                        <MetricCard 
                          label="Interactions" 
                          value={sessionDetails.stats.interactions}
                          icon={MousePointerClick}
                        />
                        <MetricCard 
                          label="Screenshots" 
                          value={sessionDetails.stats.screenshots}
                          icon={Camera}
                        />
                        <MetricCard 
                          label="Tabs" 
                          value={sessionDetails.stats.tabs}
                          icon={Globe}
                        />
                      </div>

                      {/* Analytics Section */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <Activity size={20} />
                          Session Analytics
                        </h3>
                        <SessionAnalytics actions={sessionDetails.events} />
                      </div>

                      {/* Input Tracking Section */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <Keyboard size={20} />
                          User Input Tracking
                        </h3>
                        <div className="max-h-[400px] overflow-y-auto pr-2">
                          <InputTracking actions={sessionDetails.events} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline Tab */}
                  {sessionModalTab === 'timeline' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Activity size={20} />
                        Session Timeline ({sessionDetails.events.length} events)
                      </h3>
                      <SessionTimeline actions={sessionDetails.events} />
                    </div>
                  )}

                  {/* Screenshots Tab */}
                  {sessionModalTab === 'screenshots' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Camera size={20} />
                        Screenshots ({sessionDetails.screenshots.length})
                      </h3>
                      {sessionDetails.screenshots.length > 0 ? (
                        <ScreenshotGallery 
                          screenshots={sessionDetails.screenshots}
                          showSearch={true}
                          onRefresh={() => {
                            // Refetch session details after OCR processing
                            handleViewSession(selectedSession)
                          }}
                        />
                      ) : (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                          <Camera size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No screenshots available for this session</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tabs Tab */}
                  {sessionModalTab === 'tabs' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-w-0 overflow-x-hidden">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Globe size={20} />
                        Tabs in This Session ({sessionDetails.tabs.length})
                      </h3>
                      
                      {sessionDetails.tabs.length > 0 ? (
                        <>
                          {/* Tabs Analytics */}
                          <div className="grid gap-6 lg:grid-cols-2 mb-6 min-w-0">
                            {/* Time Spent per Tab */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-0 overflow-x-hidden">
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <BarChart3 size={16} />
                                Time Spent per Tab
                              </h4>
                              <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={sessionDetails.tabs.map(tab => ({
                                    name: tab.title.length > 20 ? tab.title.substring(0, 20) + '...' : tab.title,
                                    time: Math.round(tab.totalActiveMs / 1000)
                                  }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis 
                                      dataKey="name" 
                                      stroke="#9ca3af"
                                      fontSize={10}
                                      angle={-45}
                                      textAnchor="end"
                                      height={60}
                                    />
                                    <YAxis stroke="#9ca3af" fontSize={10} />
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: '#1f2937', 
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                        color: '#f9fafb'
                                      }}
                                      formatter={(value) => `${Math.floor(value / 60)}m ${value % 60}s`}
                                    />
                                    <Bar dataKey="time" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Domain Distribution */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-0 overflow-x-hidden">
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Globe size={16} />
                                Domain Distribution
                              </h4>
                              <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RechartsPieChart>
                                    <Pie
                                      data={(() => {
                                        const domainMap = {};
                                        sessionDetails.tabs.forEach(tab => {
                                          try {
                                            const domain = new URL(tab.url).hostname;
                                            domainMap[domain] = (domainMap[domain] || 0) + 1;
                                          } catch {}
                                        });
                                        return Object.entries(domainMap)
                                          .map(([name, value]) => ({ name, value }))
                                          .slice(0, 8);
                                      })()}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={({ name, percent }) => `${name.substring(0, 15)} ${(percent * 100).toFixed(0)}%`}
                                      outerRadius={60}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {(() => {
                                        const domainMap = {};
                                        sessionDetails.tabs.forEach(tab => {
                                          try {
                                            const domain = new URL(tab.url).hostname;
                                            domainMap[domain] = (domainMap[domain] || 0) + 1;
                                          } catch {}
                                        });
                                        return Object.entries(domainMap)
                                          .map(([name, value]) => ({ name, value }))
                                          .slice(0, 8);
                                      })().map((entry, index) => {
                                        const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#84cc16', '#f97316'];
                                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                                      })}
                                    </Pie>
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: '#1f2937', 
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                        color: '#f9fafb'
                                      }}
                                    />
                                  </RechartsPieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>

                          {/* Tabs List */}
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {sessionDetails.tabs.map((tab, index) => {
                              const getDomain = (url) => {
                                try {
                                  return new URL(url).hostname;
                                } catch {
                                  return url;
                                }
                              };
                              
                              return (
                                <div
                                  key={tab.tabId}
                                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-semibold text-xs">
                                          {index + 1}
                                        </div>
                                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                          {tab.title || 'Untitled Tab'}
                                        </div>
                                      </div>
                                      <div className="ml-8 text-xs text-slate-600 dark:text-slate-400">
                                        <div className="truncate">{tab.url}</div>
                                        <div className="mt-1">
                                          <span className="font-medium">Domain:</span> {getDomain(tab.url)} • 
                                          <span className="font-medium ml-1">Activations:</span> {tab.activations}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="ml-4 text-right">
                                      <div className="text-lg font-bold text-cyan-400">
                                        {`${Math.floor(tab.totalActiveMs / 1000 / 60)}m ${Math.round(tab.totalActiveMs / 1000) % 60}s`}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-500">
                                        Time Spent
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                          <Globe size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No tabs tracked in this session</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}


