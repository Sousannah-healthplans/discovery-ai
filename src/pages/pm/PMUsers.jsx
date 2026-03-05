import DashboardLayout from '../../layouts/DashboardLayout';
import MetricCard from '../../components/MetricCard';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Activity,
  Eye,
  Clock,
  TrendingUp,
  X,
  BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { pmFetchUsers, pmFetchUserOverview, pmFetchUserSessions } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';

export default function PMUsers() {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 12;

  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';

  useEffect(() => {
    if (!baseUrl || !token) return;
    
    setLoading(true);
    pmFetchUsers(baseUrl, token)
      .then(usersData => {
        const usersList = Array.isArray(usersData) ? usersData : [];
        setAllUsers(usersList);
        setUsers(usersList);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching users:', error);
        setUsers([]);
        setAllUsers([]);
        setLoading(false);
      });
  }, [baseUrl, token]);

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setUserDetailsLoading(true);
    
    try {
      const [overview, sessions] = await Promise.all([
        pmFetchUserOverview(baseUrl, user.userId, token),
        pmFetchUserSessions(baseUrl, user.userId, token, 100)
      ]);
      
      setUserDetails({
        overview,
        sessions,
        user
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      setUserDetails({
        overview: null,
        sessions: [],
        user
      });
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setUserDetails(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const seconds = Math.floor((end - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Calculate analytics
  const totalUsers = allUsers.length;
  const totalEvents = allUsers.reduce((sum, u) => sum + (u.events || 0), 0);
  const avgEventsPerUser = totalUsers > 0 ? Math.round(totalEvents / totalUsers) : 0;
  const activeUsers = allUsers.filter(u => {
    const lastSeen = u.lastTs ? new Date(u.lastTs).getTime() : 0;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return lastSeen > dayAgo;
  }).length;

  // Users by activity (for chart)
  const usersByActivity = allUsers
    .sort((a, b) => (b.events || 0) - (a.events || 0))
    .slice(0, 10)
    .map(u => ({
      name: u.name || u.username || u.userId?.slice(0, 8) || 'Unknown',
      events: u.events || 0
    }));

  // Pagination
  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  if (loading) {
    return (
      <DashboardLayout variant="pm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading users...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="pm">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Users size={24} />
              Team Users
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              View activity and analytics for your team members
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <MetricCard 
          label="Total Users" 
          value={totalUsers} 
          icon={Users}
        />
        <MetricCard 
          label="Total Events" 
          value={totalEvents} 
          icon={Activity}
        />
        <MetricCard 
          label="Avg Events/User" 
          value={avgEventsPerUser} 
          icon={TrendingUp}
        />
        <MetricCard 
          label="Active (24h)" 
          value={activeUsers} 
          icon={Activity}
        />
      </div>

      {/* Top Users Chart */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Top Users by Activity
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={usersByActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9ca3af"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
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
              <Bar dataKey="events" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {currentUsers.map((user, idx) => (
          <div key={user.userId || idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-lg mb-1 truncate">
                  {user.name || user.username || `User ${user.userId?.slice(0, 12)}`}
                </h4>
                {user.email && (
                  <div className="text-sm text-slate-400 dark:text-slate-500 mb-2 truncate">
                    {user.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                  <Activity size={14} className="flex-shrink-0" />
                  <span>{user.events || 0} events</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1 mb-1">
                  <Calendar size={12} className="flex-shrink-0" />
                  First seen: {formatDate(user.firstTs)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                  <Clock size={12} className="flex-shrink-0" />
                  Last seen: {formatDate(user.lastTs)}
                </div>
              </div>
            </div>
            
            {/* User Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-500">User ID:</span>
                <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                  {user.userId?.substring(0, 8)}...
                </code>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10">
              <button
                onClick={() => handleViewUser(user)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-400 transition-colors text-sm"
              >
                <Eye size={14} />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {users.length > usersPerPage && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <div className="text-sm text-slate-400">
            Showing {startIndex + 1} to {Math.min(endIndex, users.length)} of {users.length} users
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

      {(!users || users.length === 0) && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">No Users Found</h3>
          <p className="text-slate-500 dark:text-slate-500">Users will appear here once they have activity.</p>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {selectedUser.name || selectedUser.username || `User ${selectedUser.userId?.slice(0, 12)}`}
                </h2>
                {selectedUser.email && (
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{selectedUser.email}</p>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
              {userDetailsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Loading user details...</p>
                  </div>
                </div>
              ) : userDetails ? (
                <div className="space-y-6">
                  {/* Overview Stats */}
                  {userDetails.overview && (
                    <div className="grid gap-4 md:grid-cols-4">
                      <MetricCard 
                        label="Total Sessions" 
                        value={userDetails.overview.totalSessions || 0} 
                        icon={Activity}
                      />
                      <MetricCard 
                        label="Total Events" 
                        value={userDetails.overview.totalEvents || 0} 
                        icon={Activity}
                      />
                      <MetricCard 
                        label="Screenshots" 
                        value={userDetails.overview.screenshots || 0} 
                        icon={Activity}
                      />
                      <MetricCard 
                        label="Avg Session" 
                        value={userDetails.overview.avgTimeSec ? (() => {
                          const secs = Math.round(userDetails.overview.avgTimeSec);
                          const mins = Math.floor(secs / 60);
                          const remainingSecs = secs % 60;
                          return mins > 0 ? `${mins}m ${remainingSecs}s` : `${remainingSecs}s`;
                        })() : '0s'} 
                        icon={Clock}
                      />
                    </div>
                  )}

                  {/* Recent Sessions */}
                  {userDetails.sessions && userDetails.sessions.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Recent Sessions ({userDetails.sessions.length})</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userDetails.sessions.slice(0, 10).map((session, idx) => (
                          <div key={session.sessionId || idx} className="p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">Session {session.sessionId?.slice(0, 12)}</div>
                                <div className="text-xs text-slate-400">
                                  {formatDate(session.start)} - {formatDate(session.end)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-emerald-400">
                                  {formatDuration(session.start, session.end)}
                                </div>
                                <div className="text-xs text-slate-400">{session.count || 0} events</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View Full Details Link */}
                  <div className="flex justify-end">
                    <Link
                      to={`/pm/users/${userDetails.user.userId}`}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                      View Full Details
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p>Failed to load user details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
