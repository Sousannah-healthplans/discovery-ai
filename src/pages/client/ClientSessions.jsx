import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useSessions } from '../../lib/useData';
import { RefreshCw } from 'lucide-react';

export default function ClientSessions() {
  // Use optimized cached data hook
  const { data: sessions, loading, refresh } = useSessions(100);

  // Process rows using useMemo
  const rows = useMemo(() => {
    return (sessions || [])
      .map(s => ({
        id: s.sessionId,
        userId: s.userId || 'Anonymous',
        eventCount: s.count || 0,
        startTime: s.start ? new Date(s.start).toLocaleString() : 'Unknown',
        endTime: s.end ? new Date(s.end).toLocaleString() : 'Unknown',
        durationSec: Math.round(s.durationSec || 0)
      }))
      .filter(s => s.durationSec > 0);
  }, [sessions]);

  const columns = [
    { key: 'id', header: 'Session ID' },
    { key: 'userId', header: 'User ID' },
    { key: 'eventCount', header: 'Events' },
    { key: 'startTime', header: 'Start Time' },
    { key: 'endTime', header: 'End Time' },
    { key: 'durationSec', header: 'Duration (s)' },
    { key: 'actions', header: 'Actions', render: (v, r) => <Link className="text-cyan-300" to={`/client/sessions/${r.id}`}>View</Link> },
  ];

  if (loading && (!sessions || sessions.length === 0)) {
    return (
      <DashboardLayout variant="client">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading sessions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="client">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Sessions</h2>
        <button
          onClick={() => refresh(true)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      <DataTable rows={rows} columns={columns} searchKeys={["id","userId","startTime","endTime"]} />
    </DashboardLayout>
  );
}
