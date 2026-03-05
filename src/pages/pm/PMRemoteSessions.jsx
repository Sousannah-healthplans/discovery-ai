import DashboardLayout from '../../layouts/DashboardLayout';
import { useEffect, useState, useCallback } from 'react';
import {
  Radio,
  Play,
  Square,
  Pause,
  Zap,
  Users,
  Activity,
  Clock,
  Eye,
  EyeOff,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Shield,
  Timer,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  pmFetchUsers,
  pmSendRemoteCommand,
  pmSendBulkRemoteCommand,
  pmGetRemoteStatus
} from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';

export default function PMRemoteSessions() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remoteStatus, setRemoteStatus] = useState({});
  const [remoteLoading, setRemoteLoading] = useState({});
  const [sessionName, setSessionName] = useState('Remote Session');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  // Bulk control state
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);

  // Command history
  const [expandedUser, setExpandedUser] = useState(null);

  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';

  // Fetch all users
  useEffect(() => {
    if (!baseUrl || !token) return;
    setLoading(true);
    pmFetchUsers(baseUrl, token)
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setUsers(list);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        setUsers([]);
        setLoading(false);
      });
  }, [baseUrl, token]);

  // Fetch remote statuses for all users
  const fetchAllStatuses = useCallback(async () => {
    if (!baseUrl || !token || users.length === 0) return;
    const statuses = {};
    await Promise.all(
      users.map(async (user) => {
        try {
          const status = await pmGetRemoteStatus(baseUrl, token, user.userId);
          statuses[user.userId] = status;
        } catch (e) {
          // silently ignore
        }
      })
    );
    setRemoteStatus(statuses);
  }, [baseUrl, token, users]);

  useEffect(() => {
    fetchAllStatuses();
    const interval = setInterval(fetchAllStatuses, 15000);
    return () => clearInterval(interval);
  }, [fetchAllStatuses]);

  // Clear notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Send a remote command to a single user
  const handleCommand = async (trackerUserId, command) => {
    setRemoteLoading(prev => ({ ...prev, [trackerUserId]: true }));
    try {
      await pmSendRemoteCommand(baseUrl, token, trackerUserId, command, sessionName || 'Remote Session');
      // Refresh status
      const status = await pmGetRemoteStatus(baseUrl, token, trackerUserId);
      setRemoteStatus(prev => ({ ...prev, [trackerUserId]: status }));

      const userName = users.find(u => u.userId === trackerUserId)?.name || trackerUserId.slice(0, 8);
      const actionLabel = command.replace('_session', '').replace('_', ' ');
      setNotification({ type: 'success', message: `${actionLabel} sent to ${userName}` });
    } catch (e) {
      console.error('Remote command error:', e);
      setNotification({ type: 'error', message: `Failed to send command: ${e.message}` });
    } finally {
      setRemoteLoading(prev => ({ ...prev, [trackerUserId]: false }));
    }
  };

  // Bulk command
  const handleBulkCommand = async (command) => {
    if (selectedUsers.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedUsers);
      await pmSendBulkRemoteCommand(baseUrl, token, ids, command, sessionName || 'Remote Session');

      // Refresh statuses
      const statuses = { ...remoteStatus };
      await Promise.all(ids.map(async id => {
        try {
          statuses[id] = await pmGetRemoteStatus(baseUrl, token, id);
        } catch (e) {}
      }));
      setRemoteStatus(statuses);

      const actionLabel = command.replace('_session', '').replace('_', ' ');
      setNotification({ type: 'success', message: `${actionLabel} sent to ${ids.length} user(s)` });
    } catch (e) {
      console.error('Bulk command error:', e);
      setNotification({ type: 'error', message: `Bulk command failed: ${e.message}` });
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.userId)));
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.userId && u.userId.toLowerCase().includes(q))
    );
  });

  // Stats
  const activeStealthCount = Object.values(remoteStatus).filter(s => s?.stealthTracking).length;
  const totalUsers = users.length;

  const formatDate = (ts) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDuration = (startedAt) => {
    if (!startedAt) return '';
    const diff = Date.now() - new Date(startedAt).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  };

  if (loading) {
    return (
      <DashboardLayout variant="pm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading remote session control...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="pm">
      <div className="space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Radio size={24} className="text-cyan-400" />
              </div>
              Remote Session Control
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Start, pause, and end tracking sessions on user devices remotely and anonymously.
              Users will not see any indication of active remote tracking.
            </p>
          </div>
          <button
            onClick={fetchAllStatuses}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <div className="text-xs text-slate-500">Total Users</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Eye size={20} className="text-cyan-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-400">{activeStealthCount}</div>
                <div className="text-xs text-slate-500">Active Stealth</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <EyeOff size={20} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalUsers - activeStealthCount}</div>
                <div className="text-xs text-slate-500">Not Tracking</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{selectedUsers.size}</div>
                <div className="text-xs text-slate-500">Selected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Session Name + Search + Bulk Toggle */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Session Name Input */}
            <div className="flex-1 min-w-0">
              <label className="text-xs text-slate-500 mb-1 block">Session Name</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Enter session name..."
                className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Search */}
            <div className="flex-1 min-w-0">
              <label className="text-xs text-slate-500 mb-1 block">Search Users</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or ID..."
                  className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Bulk Toggle */}
            <div className="flex items-end gap-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">&nbsp;</label>
                <button
                  onClick={() => setShowBulkPanel(!showBulkPanel)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
                    showBulkPanel
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <Zap size={16} />
                  Bulk Control
                  {showBulkPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Control Panel */}
          {showBulkPanel && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors"
                >
                  {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-slate-400">
                  {selectedUsers.size} of {filteredUsers.length} users selected
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => handleBulkCommand('start_session')}
                  disabled={selectedUsers.size === 0 || bulkLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Start All
                </button>
                <button
                  onClick={() => handleBulkCommand('pause_session')}
                  disabled={selectedUsers.size === 0 || bulkLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
                  Pause All
                </button>
                <button
                  onClick={() => handleBulkCommand('resume_session')}
                  disabled={selectedUsers.size === 0 || bulkLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Resume All
                </button>
                <button
                  onClick={() => handleBulkCommand('end_session')}
                  disabled={selectedUsers.size === 0 || bulkLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                  End All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users Grid */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
            <Users size={48} className="mx-auto text-slate-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-400 mb-2">No Users Found</h3>
            <p className="text-slate-500">
              {searchQuery ? 'No users match your search.' : 'Users will appear here once they have registered.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => {
              const status = remoteStatus[user.userId];
              const isActive = status?.stealthTracking;
              const isLoading = remoteLoading[user.userId];
              const isSelected = selectedUsers.has(user.userId);
              const isExpanded = expandedUser === user.userId;

              return (
                <div
                  key={user.userId}
                  className={`bg-white/5 border rounded-2xl overflow-hidden transition-all ${
                    isActive
                      ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : isSelected
                      ? 'border-purple-500/40'
                      : 'border-white/10'
                  }`}
                >
                  {/* User Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {showBulkPanel && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectUser(user.userId)}
                            className="w-4 h-4 rounded border-white/30 bg-white/5 text-cyan-500 focus:ring-cyan-500 flex-shrink-0"
                          />
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">
                            {user.name || user.username || `User ${user.userId?.slice(0, 8)}`}
                          </h4>
                          <p className="text-xs text-slate-500 truncate">
                            {user.email || user.username || user.userId?.slice(0, 16)}
                          </p>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {isActive ? (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            Tracking
                          </>
                        ) : (
                          <>
                            <WifiOff size={10} />
                            Idle
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stealth session info */}
                    {isActive && status?.stealthSessionName && (
                      <div className="mb-3 px-3 py-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-cyan-300 flex items-center gap-1">
                            <Eye size={12} />
                            {status.stealthSessionName}
                          </span>
                          {status.stealthStartedAt && (
                            <span className="text-cyan-400/70 flex items-center gap-1">
                              <Timer size={12} />
                              {formatDuration(status.stealthStartedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* User stats */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Activity size={12} />
                        {user.events || 0} events
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(user.lastTs)}
                      </span>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center gap-2">
                      {!isActive ? (
                        <button
                          onClick={() => handleCommand(user.userId, 'start_session')}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                        >
                          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                          Start Session
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleCommand(user.userId, 'pause_session')}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                          >
                            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
                            Pause
                          </button>
                          <button
                            onClick={() => handleCommand(user.userId, 'resume_session')}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                          >
                            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                            Resume
                          </button>
                          <button
                            onClick={() => handleCommand(user.userId, 'end_session')}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                          >
                            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />}
                            End
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expandable Command History */}
                  <div className="border-t border-white/5">
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                      className="w-full px-5 py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      Command History
                    </button>

                    {isExpanded && status?.recentCommands && (
                      <div className="px-5 pb-4 max-h-48 overflow-y-auto">
                        {status.recentCommands.length === 0 ? (
                          <p className="text-xs text-slate-600 text-center py-2">No commands sent yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {status.recentCommands.slice(0, 5).map((cmd, idx) => (
                              <div key={cmd._id || idx} className="flex items-center justify-between text-xs px-2 py-1.5 bg-white/3 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    cmd.status === 'executed' ? 'bg-emerald-400' :
                                    cmd.status === 'delivered' ? 'bg-amber-400' :
                                    cmd.status === 'pending' ? 'bg-blue-400' :
                                    'bg-slate-500'
                                  }`} />
                                  <span className="text-slate-300">
                                    {cmd.command?.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    cmd.status === 'executed' ? 'bg-emerald-500/20 text-emerald-400' :
                                    cmd.status === 'delivered' ? 'bg-amber-500/20 text-amber-400' :
                                    cmd.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-slate-500/20 text-slate-400'
                                  }`}>
                                    {cmd.status}
                                  </span>
                                  <span className="text-slate-600">
                                    {formatDate(cmd.createdAt)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">How Remote Sessions Work</h4>
              <p className="text-sm text-slate-400">
                Remote commands are sent to the user's browser extension silently. The extension polls for new commands every 15 seconds.
                When a stealth session is active, the extension captures screenshots and tracks activity without showing any indication to the user.
                Commands expire after 5 minutes if not picked up by the extension.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

