import DashboardLayout from '../../layouts/DashboardLayout';
import { useEffect, useState } from 'react';
import { 
  Users, 
  Bell, 
  Check, 
  X, 
  Loader2, 
  LogOut, 
  Clock, 
  UserCheck,
  Building2,
  Calendar,
  Mail,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { 
  extFetchInvitations, 
  extAcceptInvitation, 
  extRejectInvitation,
  extLeaveTeam 
} from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { useAuth } from '../../auth/AuthContext';

export default function ClientTeam() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [allInvitations, setAllInvitations] = useState([]); // Including past ones
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';
  
  // Get team info from user context
  const isInTeam = !!user?.projectId;
  const teamId = user?.projectId;

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const data = await extFetchInvitations(baseUrl, token);
      const invites = Array.isArray(data) ? data : [];
      setInvitations(invites.filter(inv => inv.status === 'pending'));
      setAllInvitations(invites);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (baseUrl && token) {
      loadInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, token]);

  const handleAccept = async (invitationId) => {
    setActionLoading(invitationId);
    try {
      const result = await extAcceptInvitation(baseUrl, token, invitationId);
      setNotification({ type: 'success', message: `You've joined the team: ${result.projectId}` });
      
      // Persist updated team membership into stored user so AuthContext picks it up after reload
      try {
        const rawUser = localStorage.getItem('mvp_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          parsed.projectId = result.projectId || parsed.projectId || null;
          localStorage.setItem('mvp_user', JSON.stringify(parsed));
        }
      } catch (e) {
        // Ignore storage errors; reload will still work but might require re-login
        console.warn('Failed to update stored user projectId after accepting team invite:', e);
      }

      // Refresh the page after a short delay to update user context
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to accept invitation' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (invitationId) => {
    setActionLoading(invitationId);
    try {
      await extRejectInvitation(baseUrl, token, invitationId);
      setInvitations(prev => prev.filter(inv => inv._id !== invitationId));
      setNotification({ type: 'success', message: 'Invitation declined' });
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to decline invitation' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveTeam = async () => {
    setLeaveLoading(true);
    try {
      await extLeaveTeam(baseUrl, token);
      setNotification({ type: 'success', message: 'You have left the team' });
      setShowLeaveModal(false);
      // Refresh the page to update user context
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to leave team' });
    } finally {
      setLeaveLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loading) {
    return (
      <DashboardLayout variant="client">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading team info...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="client">
      <div className="space-y-8">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            notification.type === 'success' 
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
            <Users size={28} />
            My Team
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your team membership and view invitations
          </p>
        </div>

        {/* Current Team Status */}
        <div className={`rounded-2xl p-6 border ${
          isInTeam 
            ? 'bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/30'
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isInTeam ? 'bg-emerald-500/20' : 'bg-slate-500/20'
              }`}>
                {isInTeam ? (
                  <Building2 size={32} className="text-emerald-400" />
                ) : (
                  <Users size={32} className="text-slate-400" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">
                  {isInTeam ? 'Team Member' : 'No Team'}
                </h3>
                {isInTeam ? (
                  <>
                    <p className="text-slate-400 flex items-center gap-2">
                      <Shield size={16} className="text-cyan-400" />
                      Member of <span className="text-cyan-400 font-semibold">{teamId}</span>
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Your activity is visible to your project manager
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500">
                    You're not part of any team yet. Accept an invitation to join a team.
                  </p>
                )}
              </div>
            </div>
            {isInTeam && (
              <button
                onClick={() => setShowLeaveModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
              >
                <LogOut size={18} />
                Leave Team
              </button>
            )}
          </div>

          {isInTeam && (
            <div className="mt-6 pt-6 border-t border-white/10 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <Building2 size={20} className="text-cyan-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-500">Project ID</div>
                  <div className="font-semibold">{teamId}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <UserCheck size={20} className="text-purple-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-500">Status</div>
                  <div className="font-semibold text-emerald-400">Active</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <Shield size={20} className="text-amber-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-500">Role</div>
                  <div className="font-semibold">Team Member</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Bell size={20} className="text-amber-400" />
            Pending Invitations
            {invitations.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-sm rounded-full">
                {invitations.length}
              </span>
            )}
          </h3>

          {invitations.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <Bell size={48} className="mx-auto text-slate-500 mb-4" />
              <h4 className="text-lg font-semibold text-slate-400 mb-2">No Pending Invitations</h4>
              <p className="text-slate-500 max-w-md mx-auto">
                When a project manager invites you to join their team, the invitation will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div 
                  key={invitation._id}
                  className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Clock size={28} className="text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold mb-1">
                          Team Invitation
                        </h4>
                        <p className="text-slate-400 mb-2">
                          <span className="text-amber-400 font-medium">
                            {invitation.invitedByName || invitation.invitedByEmail || 'A Project Manager'}
                          </span>
                          {' '}invites you to join team{' '}
                          <span className="text-cyan-400 font-semibold">{invitation.projectId}</span>
                        </p>
                        {invitation.message && (
                          <div className="bg-white/5 rounded-lg p-3 text-sm text-slate-300 italic mb-2">
                            "{invitation.message}"
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          {invitation.invitedByEmail && (
                            <span className="flex items-center gap-1">
                              <Mail size={14} />
                              {invitation.invitedByEmail}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(invitation.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                      <button
                        onClick={() => handleReject(invitation._id)}
                        disabled={actionLoading === invitation._id || isInTeam}
                        className="flex items-center gap-2 px-5 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {actionLoading === invitation._id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <X size={18} />
                        )}
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(invitation._id)}
                        disabled={actionLoading === invitation._id || isInTeam}
                        className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50"
                      >
                        {actionLoading === invitation._id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Check size={18} />
                        )}
                        Accept
                      </button>
                    </div>
                  </div>
                  {isInTeam && (
                    <div className="mt-4 p-3 bg-amber-500/20 rounded-lg text-sm text-amber-300 flex items-center gap-2">
                      <AlertCircle size={16} />
                      You must leave your current team before accepting another invitation.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invitation History (if any past invitations) */}
        {allInvitations.filter(inv => inv.status !== 'pending').length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-400">
              <Clock size={20} />
              Invitation History
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Team</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Invited By</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allInvitations.filter(inv => inv.status !== 'pending').map((invitation) => (
                    <tr key={invitation._id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{invitation.projectId}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {invitation.invitedByName || invitation.invitedByEmail || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm">
                        {formatDate(invitation.respondedAt || invitation.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                          invitation.status === 'accepted' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : invitation.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {invitation.status === 'accepted' ? <CheckCircle2 size={12} /> : 
                           invitation.status === 'rejected' ? <XCircle size={12} /> : 
                           <X size={12} />}
                          {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Leave Team Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-white/10">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogOut size={32} className="text-red-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Leave Team?</h2>
                <p className="text-slate-400">
                  Are you sure you want to leave <span className="text-cyan-400 font-semibold">{teamId}</span>?
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Your project manager will no longer be able to view your activity. You can rejoin if invited again.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  disabled={leaveLoading}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveTeam}
                  disabled={leaveLoading}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {leaveLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <LogOut size={18} />
                      Leave Team
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

