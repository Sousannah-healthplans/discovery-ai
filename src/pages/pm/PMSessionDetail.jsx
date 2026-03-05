import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import SessionTimeline from '../../components/SessionTimeline';
import ScreenshotGallery from '../../components/ScreenshotGallery';
import MetricCard from '../../components/MetricCard';
import InputTracking from '../../components/InputTracking';
import { pmFetchUserEvents, pmFetchUsers } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { Activity, ArrowLeft, Clock, Eye, Keyboard, MousePointerClick, RefreshCw } from 'lucide-react';

export default function PMSessionDetail() {
  const { userId, sessionId } = useParams();
  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [user, setUser] = useState(null);

  const load = async () => {
    if (!baseUrl || !token || !userId || !sessionId) return;
    setLoading(true);
    try {
      const [allUsers, sessionEvents, sessionShots] = await Promise.all([
        pmFetchUsers(baseUrl, token),
        pmFetchUserEvents(baseUrl, userId, token, undefined, 500, sessionId),
        pmFetchUserEvents(baseUrl, userId, token, 'screenshot', 500, sessionId)
      ]);

      const list = Array.isArray(allUsers) ? allUsers : [];
      const matched = list.find(u => u?.userId === userId) || null;
      setUser(matched);

      setEvents(Array.isArray(sessionEvents) ? sessionEvents : []);
      setScreenshots(Array.isArray(sessionShots) ? sessionShots : []);
    } catch (e) {
      console.error('Error loading PM session detail:', e);
      setEvents([]);
      setScreenshots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, token, userId, sessionId]);

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const processed = useMemo(() => {
    const sorted = [...(events || [])].sort((a, b) => (a?.ts || 0) - (b?.ts || 0));
    const start = sorted[0]?.ts || null;
    const end = sorted[sorted.length - 1]?.ts || null;
    const durationSec = start && end ? Math.round((end - start) / 1000) : 0;

    const noiseTypes = ['scroll', 'page_heartbeat', 'window_blur', 'window_focus', 'visibility_change'];
    const timelineEvents = sorted.filter(e => e?.type && e.type !== 'screenshot' && !noiseTypes.includes(e.type));

    const actions = timelineEvents.map((e) => {
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

    const interactionTypes = ['click', 'button_click', 'input', 'change', 'form_submit', 'key_down', 'key_up', 'media_play', 'media_pause'];
    const interactions = actions.filter(a => interactionTypes.includes(a.type)).length;

    const shots = (screenshots || []).map((s, idx) => ({
      id: String(s._id || idx),
      ts: s.ts,
      dataUrl: s?.data?.dataUrl || s?.dataUrl || s?.data?.cloudinaryUrl || s?.cloudinaryUrl || null,
      url: s?.data?.url || s?.url || '',
      title: s?.data?.title || s?.title || ''
    }));

    return {
      start,
      end,
      durationSec,
      actions,
      interactions,
      shots
    };
  }, [events, screenshots]);

  const userLabel = user?.name || user?.email || user?.username || userId;

  return (
    <DashboardLayout variant="pm">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to="/pm/sessions" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:underline">
                <ArrowLeft size={16} />
                Back to Sessions
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Session Details
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              User: <span className="font-medium">{userLabel}</span> · Session ID: <span className="font-mono text-emerald-500">{sessionId}</span>
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading session details...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Duration" value={formatDuration(processed.durationSec)} icon={Clock} />
            <MetricCard label="Events" value={(events || []).length} icon={Activity} />
            <MetricCard label="Interactions" value={processed.interactions} icon={MousePointerClick} />
            <MetricCard label="Screenshots" value={(processed.shots || []).length} icon={Eye} />
          </div>

          {/* Input Tracking Section */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Keyboard size={20} />
              User Input Tracking
            </h2>
            <div className="max-h-[400px] overflow-y-auto pr-2">
              <InputTracking actions={processed.actions} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Activity size={20} />
                  Session Timeline
                </h2>
                <SessionTimeline actions={processed.actions} />
              </div>
            </div>

            <div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Eye size={20} />
                  Screenshots ({(processed.shots || []).length})
                </h2>
                {(processed.shots || []).length > 0 ? (
                  <ScreenshotGallery screenshots={processed.shots} />
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Eye size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No screenshots available for this session</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}


