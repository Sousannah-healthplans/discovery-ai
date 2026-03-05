import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import MetricCard from '../../components/MetricCard';
import { useEffect, useMemo, useState } from 'react';
import { 
  Activity, 
  Clock, 
  Calendar,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { pmFetchSessions, pmFetchOverview, pmFetchUsers } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';

export default function PMSessions() {
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalEvents: 0,
    avgDuration: 0
  });

  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';

  useEffect(() => {
    if (!baseUrl || !token) return;
    
    setLoading(true);
    
    Promise.all([
      pmFetchSessions(baseUrl, token, 500),
      pmFetchOverview(baseUrl, token),
      pmFetchUsers(baseUrl, token)
    ])
      .then(([sessionsData, overview, usersData]) => {
        const sessionsList = Array.isArray(sessionsData) ? sessionsData : [];
        setSessions(sessionsList);
        setUsers(Array.isArray(usersData) ? usersData : []);
        
        setStats({
          totalSessions: overview?.totalSessions || sessionsList.length,
          totalEvents: overview?.totalEvents || 0,
          avgDuration: overview?.avgSessionDurationSec || 0
        });
        
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching sessions:', err);
        setLoading(false);
      });
  }, [baseUrl, token]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const usersById = useMemo(() => {
    const map = new Map();
    for (const u of users) {
      if (u?.userId) map.set(u.userId, u);
    }
    return map;
  }, [users]);

  const userOptions = useMemo(() => {
    const opts = users
      .map(u => {
        const label = (u?.name || u?.email || u?.username || u?.userId || '').toString().trim();
        return { value: u?.userId || '', label: label || (u?.userId || 'Unknown') };
      })
      .filter(o => o.value);

    opts.sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [users]);

  const filteredSessions = useMemo(() => {
    if (!selectedUserId) return sessions;
    return sessions.filter(s => s?.userId === selectedUserId);
  }, [sessions, selectedUserId]);

  const columns = [
    { 
      key: 'sessionId', 
      header: 'Session ID', 
      render: (v, row) => (
        <Link className="text-emerald-500 hover:underline" to={`/pm/sessions/${encodeURIComponent(row.userId)}/${encodeURIComponent(v)}`}>
          {(v || '').slice(0, 12)}...
        </Link>
      )
    },
    { 
      key: 'user', 
      header: 'User',
      render: (v) => v
    },
    { key: 'count', header: 'Events' },
    { key: 'startTime', header: 'Start Time' },
    { key: 'endTime', header: 'End Time' },
    { key: 'duration', header: 'Duration' },
  ];

  const rows = filteredSessions.map(s => {
    const u = usersById.get(s.userId);
    const display = u?.name || u?.email || u?.username || s.userId || 'Unknown';
    const sub = u?.email && u?.name ? u.email : '';

    return {
      id: `${s.userId || 'unknown'}_${s.sessionId}`,
      sessionId: s.sessionId,
      userId: s.userId || 'Unknown',
      user: (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800 dark:text-slate-200">{display}</span>
          {sub ? <span className="text-xs text-slate-500 dark:text-slate-400">{sub}</span> : null}
        </div>
      ),
      count: s.count || 0,
      startTime: formatDate(s.start),
      endTime: formatDate(s.end),
      duration: formatDuration(s.durationSec || 0)
    };
  });

  if (loading) {
    return (
      <DashboardLayout variant="pm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading sessions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="pm">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Activity size={24} />
          Team Sessions
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          View all sessions from your team members
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <MetricCard 
          label="Total Sessions" 
          value={stats.totalSessions} 
          icon={Calendar}
        />
        <MetricCard 
          label="Total Events" 
          value={stats.totalEvents} 
          icon={Activity}
        />
        <MetricCard 
          label="Avg Duration" 
          value={formatDuration(stats.avgDuration)} 
          icon={Clock}
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Users size={16} />
          People:
        </div>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="">All people</option>
          {userOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {selectedUserId ? (
          <button
            onClick={() => setSelectedUserId('')}
            className="text-sm px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Sessions Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <DataTable 
          rows={rows} 
          columns={columns} 
          searchKeys={["sessionId", "userId", "startTime"]} 
        />
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12">
          <Activity size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">No Sessions Found</h3>
          <p className="text-slate-500 dark:text-slate-500">Sessions will appear here once your team has activity.</p>
        </div>
      )}
    </DashboardLayout>
  );
}


