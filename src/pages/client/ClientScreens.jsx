import DashboardLayout from '../../layouts/DashboardLayout';
import ScreenshotGallery from '../../components/ScreenshotGallery';
import { useMemo, useState } from 'react';
import { useScreenshots, useOverview } from '../../lib/useData';
import { BACKEND_URL } from '../../lib/config';
import { RefreshCw } from 'lucide-react';

export default function ClientScreens() {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;
  
  // Use optimized cached data hooks
  const { data: screenshotsList, loading, refresh } = useScreenshots(50); // Load only 50 for speed
  const { data: overview } = useOverview(); // Get total count from overview
  
  const baseUrl = BACKEND_URL;

  // Process screenshots using useMemo
  const { allScreenshots, metrics } = useMemo(() => {
    const list = screenshotsList || [];
    
    const mapped = list.map((s, idx) => {
      // Construct screenshot URL - Priority: cloudinaryUrl > screenshotFilename > dataUrl
      let screenshotUrl = '';
      if (s.data?.cloudinaryUrl) {
        screenshotUrl = s.data.cloudinaryUrl;
      } else if (s.data?.screenshotFilename) {
        screenshotUrl = `${baseUrl}/screenshots/${s.data.screenshotFilename}`;
      } else if (s.data?.dataUrl) {
        screenshotUrl = s.data.dataUrl;
      } else if (s.data?.url) {
        screenshotUrl = s.data.url;
      }
      
      return {
        id: `${s._id || s.sessionId}_${idx}`,
        _id: s._id,
        sessionId: s.sessionId,
        url: screenshotUrl,
        device: s.data?.device || s.data?.meta?.device || 'Unknown',
        browser: s.data?.browser || s.data?.meta?.browser || 'Unknown',
        country: s.data?.country || s.data?.meta?.country || 'Unknown',
        timestamp: s.ts,
        duration: Number(s.data?.durationSec) || 0,
        fileSizeKB: s.data?.fileSizeKB || null,
        ocrText: s.ocrText || null,
        ocrTags: s.ocrTags || [],
        ocrProcessed: s.ocrProcessed !== undefined ? s.ocrProcessed : false,
        data: s.data
      };
    });

    // Get totals from overview (all screenshots and sessions)
    const totalScreenshots = overview?.metrics?.screenshots || list.length;
    const sessionsWithScreenshots = overview?.metrics?.sessionsWithScreenshots || new Set(list.map(s => s.sessionId)).size;
    const avgPerSession = sessionsWithScreenshots > 0 ? Math.round(totalScreenshots / sessionsWithScreenshots * 10) / 10 : 0;
    
    return {
      allScreenshots: mapped,
      metrics: {
        totalScreenshots, // Use total from overview
        sessionsWithScreenshots, // Use total from overview
        avgPerSession,
        loadedCount: list.length // How many we actually loaded
      }
    };
  }, [screenshotsList, overview, baseUrl]);

  const totalPages = Math.max(1, Math.ceil(allScreenshots.length / PAGE_SIZE));
  const pagedScreenshots = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return allScreenshots.slice(start, start + PAGE_SIZE);
  }, [allScreenshots, page]);

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  if (loading && (!screenshotsList || screenshotsList.length === 0)) {
    return (
      <DashboardLayout variant="client">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading screenshots...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="client">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-2">Screenshots</h2>
          <p className="text-slate-600 dark:text-slate-400">
            View all captured screenshots from user sessions
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
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
          <h3 className="font-semibold mb-2">Total Screenshots</h3>
          <p className="text-2xl font-bold text-cyan-400">{metrics.totalScreenshots}</p>
        </div>
        <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
          <h3 className="font-semibold mb-2">Showing</h3>
          <p className="text-2xl font-bold text-cyan-400">{metrics.loadedCount} <span className="text-sm font-normal text-slate-400">latest</span></p>
        </div>
        <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
          <h3 className="font-semibold mb-2">Sessions with Screenshots</h3>
          <p className="text-2xl font-bold text-cyan-400">{metrics.sessionsWithScreenshots}</p>
        </div>
        <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
          <h3 className="font-semibold mb-2">Avg per Session</h3>
          <p className="text-2xl font-bold text-cyan-400">{metrics.avgPerSession}</p>
        </div>
      </div>

      <div className="mt-6">
        <ScreenshotGallery 
          screenshots={pagedScreenshots} 
          onRefresh={() => refresh(true)}
        />
        {allScreenshots.length > PAGE_SIZE && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div>
              Showing {(page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, allScreenshots.length)} of {allScreenshots.length} screenshots
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Prev
              </button>
              <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                Page {page} / {totalPages}
              </div>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
