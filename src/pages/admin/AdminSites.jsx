import DashboardLayout from '../../layouts/DashboardLayout';
import { useEffect, useState } from 'react';
import { adminFetchSites } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { 
  Globe, 
  Calendar, 
  ExternalLink,
  Eye
} from 'lucide-react';

export default function AdminSites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';

  useEffect(() => {
    if (!baseUrl || !token) return;
    
    setLoading(true);
    // Use adminFetchSites which now returns extension users in site-like format
    adminFetchSites(baseUrl, token)
      .then(sitesData => {
        setSites(sitesData || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [baseUrl, token]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout variant="admin">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading sites...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="admin">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Globe size={24} />
              Sites Management
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Manage all extension users (legacy view - use Users page instead)
            </p>
          </div>
        </div>
      </div>


      {/* Sites List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sites.map(site => (
          <div key={site._id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-1">{site.name}</h4>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                  <Globe size={14} />
                  <a 
                    href={`https://${site.domain}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    {site.domain}
                  </a>
                  <ExternalLink size={12} />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                  <Calendar size={12} />
                  Last Active: {site.lastTs ? formatDate(site.lastTs) : 'Unknown'}
                </div>
              </div>
              
              <div className="flex gap-2">
                <a
                  href={`/admin/clients/${site.userId || site.projectId}`}
                  className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  title="View details"
                >
                  <Eye size={16} />
                </a>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-500">User ID:</span>
                <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                  {(site.userId || site.projectId)?.substring(0, 12)}...
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-500">Events:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {site.events || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-500">First Seen:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {site.firstTs ? new Date(site.firstTs).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Status:</span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                  Active
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sites.length === 0 && (
        <div className="text-center py-12">
          <Globe size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">No Extension Users Found</h3>
          <p className="text-slate-500 dark:text-slate-500">Users will appear here once they install and register the extension.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
