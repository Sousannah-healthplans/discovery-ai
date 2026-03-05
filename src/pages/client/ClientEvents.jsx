import DashboardLayout from '../../layouts/DashboardLayout';
import EventsTable from '../../components/EventsTable';
import { useEvents } from '../../lib/useData';
import { RefreshCw } from 'lucide-react';

export default function ClientEvents() {
  // Use optimized cached data hook
  const { data: events, loading, refresh } = useEvents(undefined, 200);

  if (loading && (!events || events.length === 0)) {
    return (
      <DashboardLayout variant="client">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading events...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="client">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Recent Events</h2>
        <button
          onClick={() => refresh(true)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      <EventsTable events={events || []} />
    </DashboardLayout>
  );
}
