import DashboardLayout from '../../layouts/DashboardLayout';
import ScreenshotGallery from '../../components/ScreenshotGallery';
import MetricCard from '../../components/MetricCard';
import { useEffect, useState } from 'react';
import { Camera, Users } from 'lucide-react';
import { pmFetchScreenshots, pmFetchOverview } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';

export default function PMScreenshots() {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalScreenshots: 0,
    totalUsers: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const screenshotsPerPage = 20;

  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const [shots, overview] = await Promise.all([
        pmFetchScreenshots(baseUrl, token, 500),
        pmFetchOverview(baseUrl, token)
      ]);
      
      const screenshotList = Array.isArray(shots) ? shots : [];
      setScreenshots(screenshotList);
      
      setStats({
        totalScreenshots: overview?.screenshots || screenshotList.length,
        totalUsers: overview?.totalUsers || 0
      });
    } catch (err) {
      console.error('Error fetching screenshots:', err);
      setScreenshots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (baseUrl && token) {
      fetchScreenshots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, token]);

  const processedScreenshots = screenshots.map((s, idx) => {
    const eventData = s.data || {};
    let screenshotUrl = '';
    
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
      _id: s._id,
      sessionId: s.sessionId,
      userId: s.userId,
      url: screenshotUrl,
      device: eventData.device || 'Unknown',
      browser: eventData.browser || 'Unknown',
      country: eventData.country || 'Unknown',
      timestamp: new Date(s.ts).toISOString(),
      duration: 0,
      fileSizeKB: eventData.fileSizeKB || null,
      ocrText: s.ocrText || null,
      ocrTags: s.ocrTags || [],
      ocrProcessed: s.ocrProcessed || false,
      data: s.data
    };
  }).filter(shot => shot.url && shot.url.length > 0);

  const totalPages = Math.ceil(processedScreenshots.length / screenshotsPerPage);
  const paginatedScreenshots = processedScreenshots.slice(
    (currentPage - 1) * screenshotsPerPage,
    currentPage * screenshotsPerPage
  );

  if (loading) {
    return (
      <DashboardLayout variant="pm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading screenshots...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="pm">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Camera size={24} />
          Team Screenshots
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          View all screenshots captured by your team
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <MetricCard 
          label="Total Screenshots" 
          value={stats.totalScreenshots} 
          icon={Camera}
        />
        <MetricCard 
          label="Team Members" 
          value={stats.totalUsers} 
          icon={Users}
        />
      </div>

      {/* Screenshots Gallery */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {processedScreenshots.length > 0 ? (
          <>
            <ScreenshotGallery 
              screenshots={paginatedScreenshots}
              showSearch={true}
              onRefresh={fetchScreenshots}
            />
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div className="text-sm text-slate-400">
                  Showing {(currentPage - 1) * screenshotsPerPage + 1} to {Math.min(currentPage * screenshotsPerPage, processedScreenshots.length)} of {processedScreenshots.length} screenshots
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Camera size={48} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">No Screenshots</h3>
            <p className="text-slate-500 dark:text-slate-500">Screenshots will appear here once your team captures them.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


