import DashboardLayout from '../../layouts/DashboardLayout';
import { useState, useMemo, useEffect } from 'react';
import { useTabs } from '../../lib/useData';
import { Clock, Globe, ExternalLink, Calendar, TrendingUp, BarChart3, X, RefreshCw } from 'lucide-react';
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
  Cell,
  AreaChart,
  Area
} from 'recharts';

export default function ClientTabs() {
  const [selectedTab, setSelectedTab] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // Use new tabs endpoint that aggregates ALL tabs from backend
  const { data: tabsData, loading, refresh } = useTabs();

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDomain = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  // Memoize tabs to avoid dependency issues
  const tabs = useMemo(() => tabsData || [], [tabsData]);
  const totalTime = useMemo(() => tabs.reduce((sum, tab) => sum + (tab.totalActiveMs || 0), 0), [tabs]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const domainTimeMap = {};
    tabs.forEach(tab => {
      const domain = getDomain(tab.url);
      domainTimeMap[domain] = (domainTimeMap[domain] || 0) + (tab.totalActiveMs || 0);
    });
    const domainTimeData = Object.entries(domainTimeMap)
      .map(([domain, time]) => ({ domain, time: Math.round(time / 1000) }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 10);

    const tabsByDate = {};
    tabs.forEach(tab => {
      const date = new Date(tab.created).toISOString().slice(0, 10);
      tabsByDate[date] = (tabsByDate[date] || 0) + 1;
    });
    const tabsOverTime = Object.entries(tabsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const domainCountMap = {};
    tabs.forEach(tab => {
      const domain = getDomain(tab.url);
      domainCountMap[domain] = (domainCountMap[domain] || 0) + 1;
    });
    const domainDistribution = Object.entries(domainCountMap)
      .map(([domain, count]) => ({ name: domain, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { domainTimeData, tabsOverTime, domainDistribution };
  }, [tabs]);

  // Paginate tab list
  const totalPages = Math.max(1, Math.ceil(tabs.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [tabs.length]);
  const pagedTabs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tabs.slice(start, start + pageSize);
  }, [tabs, page, pageSize]);

  const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#84cc16', '#f97316'];

  if (loading && tabs.length === 0) {
    return (
      <DashboardLayout variant="client">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading tabs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="client">
      <div className="space-y-6 overflow-x-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Globe size={24} />
            Browser Tabs
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            View all tabs opened and time spent on each tab
          </p>
        </div>
        <button
          onClick={() => refresh(true)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6 min-w-0">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="text-cyan-500" size={24} />
            <div>
              <div className="text-2xl font-bold">{tabs.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Tabs</div>
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-blue-500" size={24} />
            <div>
              <div className="text-2xl font-bold">{formatDuration(totalTime)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Time</div>
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-purple-500" size={24} />
            <div>
              <div className="text-2xl font-bold">
                {tabs.length > 0 ? formatDuration(totalTime / tabs.length) : '0s'}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Avg Time/Tab</div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6 min-w-0">
        {/* Time Spent per Domain */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-w-0 overflow-x-hidden">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Time Spent per Domain
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.domainTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="domain" 
                  stroke="#9ca3af"
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                  formatter={(value) => formatDuration(value * 1000)}
                />
                <Bar dataKey="time" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabs Opened Over Time */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-w-0 overflow-x-hidden">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Tabs Opened Over Time
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData.tabsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
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
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Domain Distribution */}
      {analyticsData.domainDistribution.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe size={20} />
            Domain Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.domainDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name.substring(0, 20)} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.domainDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs List */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">All Tabs</h3>
        {tabs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Globe size={48} className="mx-auto mb-4 opacity-50" />
            <p>No tabs tracked yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pagedTabs.map((tab, index) => (
              <div
                key={tab.tabId}
                onClick={() => setSelectedTab(tab)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-semibold">
                        {(page - 1) * pageSize + index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                          {tab.title || 'Untitled Tab'}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                          <Globe size={14} />
                          <span className="truncate">{getDomain(tab.url)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-11 space-y-1">
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        <span className="font-medium">URL:</span>{' '}
                        <a
                          href={tab.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {tab.url}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        <span className="font-medium">Created:</span> {formatDate(tab.created)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        <span className="font-medium">Last Active:</span> {formatDate(tab.lastUpdated)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        <span className="font-medium">Activations:</span> {tab.activations}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-2xl font-bold text-cyan-400 mb-1">
                      {formatDuration(tab.totalActiveMs)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500">
                      Time Spent
                    </div>
                    {tab.isActive && (
                      <div className="mt-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                        Active
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 text-sm text-slate-500 dark:text-slate-400">
              <div>
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activation History Modal */}
      {selectedTab && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedTab(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {selectedTab.title || 'Untitled Tab'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {selectedTab.url}
                </p>
              </div>
              <button
                onClick={() => setSelectedTab(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {formatDuration(selectedTab.totalActiveMs)}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Total Active Time
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {selectedTab.activations}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Activation{selectedTab.activations !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {selectedTab.events && selectedTab.events.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Tab Events ({selectedTab.events.length})
                  </h4>
                  {selectedTab.events.slice(0, 20).map((event, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            event.type === 'tab_activated' ? 'bg-green-400' :
                            event.type === 'tab_deactivated' ? 'bg-yellow-400' :
                            event.type === 'tab_removed' ? 'bg-red-400' :
                            'bg-cyan-400'
                          }`}></div>
                          <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            {event.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(event.ts).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedTab.events.length > 20 && (
                    <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                      ... and {selectedTab.events.length - 20} more events
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No events recorded for this tab</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}


