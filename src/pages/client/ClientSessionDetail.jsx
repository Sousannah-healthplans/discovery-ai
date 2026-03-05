import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import SessionTimeline from '../../components/SessionTimeline';
import ScreenshotGallery from '../../components/ScreenshotGallery';
import MetricCard from '../../components/MetricCard';
import SessionAnalytics from '../../components/SessionAnalytics';
import InputTracking from '../../components/InputTracking';
import { useSessionDetail } from '../../lib/useData';
import { BACKEND_URL } from '../../lib/config';
import { 
  Clock, 
  MousePointerClick, 
  Eye, 
  Activity,
  Download,
  Keyboard,
  Globe,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function ClientSessionDetail() {
  const { id } = useParams();
  
  // Use optimized cached data hook
  const { events: allEvents, screenshots: allScreenshots, session: matchingSession, loading, refresh } = useSessionDetail(id);
  
  const baseUrl = BACKEND_URL;

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}m ${secs}s`;
  };

  // Process all data using useMemo - events are already filtered by sessionId server-side
  const processedData = useMemo(() => {
    // Filter out noise events (already filtered by session server-side)
    const sessionEvents = (allEvents || []).filter(e => {
      if (e.type === 'screenshot') return false;
      const noiseTypes = ['scroll', 'page_heartbeat', 'window_blur', 'window_focus', 'visibility_change'];
      if (noiseTypes.includes(e.type)) return false;
      return true;
    });

    // Create timeline
    const actions = sessionEvents.map(e => {
      // Build a meaningful label: prefer element info for interactions, URL/title for navigation
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
    });

    // Process screenshots - restore original working logic
    const screenshots = (allScreenshots || []).map((s, idx) => {
      let screenshotUrl = '';
      const eventData = s.data || {};
      
      // Try multiple ways to get the screenshot URL (same as original working code)
      if (eventData?.cloudinaryUrl) {
        screenshotUrl = eventData.cloudinaryUrl;
      } else if (eventData?.screenshotFilename) {
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        screenshotUrl = `${cleanBaseUrl}/screenshots/${eventData.screenshotFilename}`;
      } else if (eventData?.dataUrl) {
        screenshotUrl = eventData.dataUrl;
      } else if (eventData?.url) {
        screenshotUrl = eventData.url;
      } else if (s.dataUrl) {
        // Check if dataUrl is at root level
        screenshotUrl = s.dataUrl;
      } else if (s.url) {
        // Check if url is at root level
        screenshotUrl = s.url;
      }
      
      return {
        id: `${s._id || s.sessionId || 'screenshot'}_${idx}`,
        _id: s._id, // Keep _id for OCR processing
        sessionId: s.sessionId || id,
        url: screenshotUrl,
        device: eventData?.device || eventData?.meta?.device || 'Unknown',
        browser: eventData?.browser || eventData?.meta?.browser || 'Unknown',
        country: eventData?.country || eventData?.meta?.country || 'Unknown',
        timestamp: new Date(s.ts || Date.now()).toISOString(),
        duration: 0,
        fileSizeKB: eventData?.fileSizeKB || null,
        ocrText: s.ocrText || null,
        ocrTags: s.ocrTags || [],
        ocrProcessed: s.ocrProcessed !== undefined ? s.ocrProcessed : false,
        data: s.data
      };
    }).filter(shot => {
      // Only filter out if URL is truly empty
      const hasUrl = shot.url && shot.url.length > 0;
      if (!hasUrl) {
        console.warn('[ClientSessionDetail] Screenshot without URL filtered out:', {
          id: shot.id,
          _id: shot._id,
          sessionId: shot.sessionId,
          dataKeys: shot.data ? Object.keys(shot.data) : 'no data',
          rawData: shot.data
        });
      }
      return hasUrl;
    });

    // Process tabs for this session - show ALL opened tabs (both active and inactive)
    const tabMap = new Map();
    const urlToKey = new Map(); // Map URLs to tab keys for events without tabId
    
    // Sort events by timestamp
    const sortedEvents = [...(allEvents || [])].sort((a, b) => 
      new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );
    
    // Track which tab is currently active
    let currentActiveTabId = null;
    
    // First pass: collect all tabs from ALL event types
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
        // Check if we've seen this URL before
        if (urlToKey.has(url)) {
          key = urlToKey.get(url);
        } else {
          key = `url_${url}`;
          urlToKey.set(url, key);
        }
      }
      
      // Skip if we can't identify this tab
      if (!key) return;
      
      // Map tabId to URL for future lookups
      if (tabId && url) {
        urlToKey.set(url, tabId);
      }
      
      // Create tab if not exists
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
      
      // Handle tab_activated - starts active time
      if (e.type === 'tab_activated') {
        // End time for previously active tab
        if (currentActiveTabId && currentActiveTabId !== key) {
          const prevTab = tabMap.get(currentActiveTabId);
          if (prevTab && prevTab.activeStart !== null) {
            prevTab.totalActiveMs += ts - prevTab.activeStart;
            prevTab.activeStart = null;
          }
        }
        // Start time for this tab
        tab.activations++;
        tab.activeStart = ts;
        currentActiveTabId = key;
      } 
      // Handle tab_deactivated or tab_removed
      else if (e.type === 'tab_deactivated' || e.type === 'tab_removed') {
        if (tab.activeStart !== null) {
          tab.totalActiveMs += ts - tab.activeStart;
          tab.activeStart = null;
        }
        if (currentActiveTabId === key) {
          currentActiveTabId = null;
        }
      } 
      // Handle window_blur - end all active time
      else if (e.type === 'window_blur' || e.type === 'visibility_change') {
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
        // Cap at 5 minutes max if still "active" (likely missed deactivation)
        const duration = sessionEnd - tab.activeStart;
        tab.totalActiveMs += Math.min(duration, 5 * 60 * 1000);
        tab.activeStart = null;
      }
      
      // If tab has activations but 0 duration, give minimal duration
      if (tab.activations > 0 && tab.totalActiveMs === 0) {
        tab.totalActiveMs = tab.activations * 1000; // 1 second per activation minimum
      }
      // Tabs with 0 activations correctly show 0 duration (they were opened but not used)
    });
    
    // Show ALL tabs with valid URLs - including inactive ones
    const sessionTabs = Array.from(tabMap.values())
      .filter(tab => {
        const hasValidUrl = tab.url && 
          tab.url !== 'Unknown URL' && 
          !tab.url.startsWith('chrome://') && 
          !tab.url.startsWith('chrome-extension://');
        return hasValidUrl;
      })
      .sort((a, b) => b.lastUpdated - a.lastUpdated);

    // Calculate session statistics
    const aggregateDuration = matchingSession ? Math.round(Number(matchingSession.durationSec) || 0) : 0;
    const aggregateEventCount = matchingSession?.count || actions.length;

    const timelineDuration = sessionEvents.length > 0
      ? Math.round(
          (Math.max(...sessionEvents.map(e => new Date(e.ts).getTime())) -
           Math.min(...sessionEvents.map(e => new Date(e.ts).getTime()))) / 1000
        )
      : 0;

    const pageViewTypes = ['page_view', 'page_load', 'page_event', 'tab_updated'];
    const pageViews = actions.filter(e => {
      if (pageViewTypes.includes(e.type)) return true;
      if (e.type === 'tab_updated' && e.data?.status === 'complete') return true;
      return false;
    }).length;

    const interactionTypes = [
      'click', 'button_click', 'input', 'change', 'form_submit', 
      'key_down', 'key_up', 'mouse_move', 'scroll',
      'media_play', 'media_pause'
    ];
    const interactions = actions.filter(e => interactionTypes.includes(e.type)).length;

    const sessionStats = {
      totalEvents: aggregateEventCount,
      duration: aggregateDuration || timelineDuration,
      pageViews: pageViews,
      interactions: interactions,
      screenshots: screenshots.length
    };

    return { actions, screenshots, sessionTabs, sessionStats };
  }, [allEvents, allScreenshots, matchingSession, id, baseUrl]);

  const { actions, screenshots, sessionTabs, sessionStats } = processedData;

  const handleExportSession = () => {
    const sessionData = {
      sessionId: id,
      stats: sessionStats,
      events: actions,
      screenshots: screenshots.length,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${id}-export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && (!allEvents || allEvents.length === 0)) {
    return (
      <DashboardLayout variant="client">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading session details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="client">
      <div className="space-y-6 overflow-x-hidden">
      {/* Session Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Session Details
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Session ID: <span className="font-mono text-cyan-400">{id}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh(true)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleExportSession}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Download size={16} />
              Export Session
            </button>
          </div>
        </div>

        {/* Session Metrics - removed Screenshots to reduce loading */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard 
            label="Total Events" 
            value={sessionStats.totalEvents}
            icon={Activity}
          />
          <MetricCard 
            label="Duration" 
            value={sessionStats.duration}
            formatter={formatDuration}
            icon={Clock}
          />
          <MetricCard 
            label="Page Views" 
            value={sessionStats.pageViews}
            icon={Eye}
          />
          <MetricCard 
            label="Interactions" 
            value={sessionStats.interactions}
            icon={MousePointerClick}
          />
        </div>
      </div>

      {/* Analytics Section */}
      <div className="mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Session Analytics
          </h2>
          <SessionAnalytics actions={actions} />
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Tabs Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-w-0 overflow-x-hidden">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Globe size={20} />
            Tabs in This Session ({sessionTabs.length})
          </h2>
          
          {sessionTabs.length > 0 ? (
            <>
              {/* Tabs Analytics */}
              <div className="grid gap-6 lg:grid-cols-2 mb-6 min-w-0">
                {/* Time Spent per Tab */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-0 overflow-x-hidden">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 size={16} />
                    Time Spent per Tab
                  </h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sessionTabs.map(tab => ({
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
                          formatter={(value) => formatDuration(value)}
                        />
                        <Bar dataKey="time" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Domain Distribution */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-0 overflow-x-hidden">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Globe size={16} />
                    Domain Distribution
                  </h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(() => {
                            const domainMap = {};
                            sessionTabs.forEach(tab => {
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
                            sessionTabs.forEach(tab => {
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
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Tabs List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessionTabs.map((tab, index) => {
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
                            {tab.isActive && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                                Active
                              </span>
                            )}
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
                            {formatDuration(Math.round(tab.totalActiveMs / 1000))}
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

        {/* Input Tracking Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Keyboard size={20} />
            User Input Tracking
          </h2>
          <div className="max-h-[400px] overflow-y-auto pr-2">
            <InputTracking actions={actions} />
          </div>
        </div>

        {/* Timeline and Screenshots */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Timeline Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity size={20} />
                Session Timeline
              </h2>
              <SessionTimeline actions={actions} />
            </div>
          </div>

          {/* Screenshots Section */}
          <div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Eye size={20} />
                Screenshots ({screenshots.length})
              </h2>
              {screenshots.length > 0 ? (
                <ScreenshotGallery screenshots={screenshots} />
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Eye size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No screenshots available for this session</p>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
