import DashboardLayout from '../../layouts/DashboardLayout';
import { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  X, 
  Check,
  Activity,
  Calendar,
  Eye,
  EyeOff,
  Search,
  Mail,
  Send,
  Clock,
  XCircle,
  Loader2,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { 
  pmFetchTeam, 
  pmUpdateTeamMember, 
  pmDeleteTeamMember,
  pmSearchUserByEmail,
  pmSendInvitation,
  pmFetchInvitations,
  pmCancelInvitation
} from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { useAuth } from '../../auth/AuthContext';

export default function PMTeam() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invitations'
  
  // Invite modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  
  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    name: '',
    isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';

  const fetchTeam = async () => {
    try {
      const data = await pmFetchTeam(baseUrl, token);
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching team:', err);
      setTeamMembers([]);
    }
  };

  const fetchInvites = async () => {
    try {
      const data = await pmFetchInvitations(baseUrl, token);
      setInvitations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setInvitations([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchTeam(), fetchInvites()]);
    setLoading(false);
  };

  useEffect(() => {
    if (baseUrl && token) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, token]);

  // Invite modal handlers
  const openInviteModal = () => {
    setInviteEmail('');
    setInviteMessage('');
    setSearchResult(null);
    setInviteError('');
    setInviteSuccess('');
    setShowInviteModal(true);
  };

  const searchUserByEmail = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('Please enter an email address');
      return;
    }

    setSearchLoading(true);
    setInviteError('');
    setInviteSuccess('');
    setSearchResult(null);

    try {
      const result = await pmSearchUserByEmail(baseUrl, token, inviteEmail.trim());
      setSearchResult(result);
    } catch (err) {
      setInviteError(err.message || 'Failed to search for user');
    } finally {
      setSearchLoading(false);
    }
  };

  const sendInvite = async () => {
    if (!searchResult?.user) return;

    setInviteLoading(true);
    setInviteError('');

    try {
      await pmSendInvitation(baseUrl, token, {
        extensionUserId: searchResult.user._id,
        email: inviteEmail.trim(),
        message: inviteMessage.trim() || undefined
      });
      setInviteSuccess(`Invitation sent to ${searchResult.user.name || searchResult.user.username}!`);
      setSearchResult(null);
      setInviteEmail('');
      setInviteMessage('');
      fetchInvites();
    } catch (err) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const cancelInvite = async (invitationId) => {
    try {
      await pmCancelInvitation(baseUrl, token, invitationId);
      fetchInvites();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
    }
  };

  // Team member handlers
  const handleEdit = (member) => {
    setSelectedMember(member);
    setFormData({
      username: member.username || '',
      password: '',
      email: member.email || '',
      name: member.name || '',
      isActive: member.isActive !== false
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleRemove = (member) => {
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    
    setFormLoading(true);
    setFormError('');
    
    try {
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }
      await pmUpdateTeamMember(baseUrl, token, selectedMember._id, updateData);
      setShowEditModal(false);
      fetchTeam();
    } catch (err) {
      setFormError(err.message || 'Failed to update team member');
    } finally {
      setFormLoading(false);
    }
  };

  const submitRemove = async () => {
    if (!selectedMember) return;
    
    setFormLoading(true);
    
    try {
      await pmDeleteTeamMember(baseUrl, token, selectedMember._id);
      setShowDeleteModal(false);
      fetchTeam();
    } catch (err) {
      console.error('Failed to remove:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const filteredMembers = teamMembers.filter(member => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (member.username || '').toLowerCase().includes(search) ||
      (member.name || '').toLowerCase().includes(search) ||
      (member.email || '').toLowerCase().includes(search)
    );
  });

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  if (loading) {
    return (
      <DashboardLayout variant="pm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading team...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="pm">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Users size={24} />
              Team Management
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Invite and manage team members {user?.projectId && <span className="text-emerald-400">({user.projectId})</span>}
            </p>
          </div>
          <button
            onClick={openInviteModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <UserPlus size={18} />
            Invite Member
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'members' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-white/5 hover:bg-white/10 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              Team Members
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{teamMembers.length}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'invitations' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-white/5 hover:bg-white/10 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send size={16} />
              Pending Invitations
              {pendingInvitations.length > 0 && (
                <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs">{pendingInvitations.length}</span>
              )}
            </div>
          </button>
        </div>

        {/* Team Members Tab */}
        {activeTab === 'members' && (
          <>
            {/* Search */}
            <div className="relative max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
              />
            </div>

            {/* Team Members Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => (
                <div key={member._id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg mb-1 truncate">
                        {member.name || member.username}
                      </h4>
                      <div className="text-sm text-slate-400 dark:text-slate-500 mb-1 truncate">
                        @{member.username}
                      </div>
                      {member.email && (
                        <div className="text-sm text-slate-500 dark:text-slate-500 mb-2 truncate">
                          {member.email}
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded flex-shrink-0 ${member.isActive !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {member.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-blue-400" />
                      <span className="text-slate-600 dark:text-slate-400">Events:</span>
                      <span className="font-medium">{member.events || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-purple-400" />
                      <span className="text-slate-600 dark:text-slate-400">Last:</span>
                      <span className="font-medium text-xs">{member.lastActive ? formatDate(member.lastActive).split(',')[0] : 'Never'}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="text-xs text-slate-500 dark:text-slate-500 space-y-1 mb-4">
                    <div>User ID: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{member.trackerUserId?.substring(0, 12)}...</code></div>
                    <div>Joined: {formatDate(member.createdAt).split(',')[0]}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-white/10">
                    <button
                      onClick={() => handleEdit(member)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400 transition-colors text-sm"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemove(member)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors text-sm"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredMembers.length === 0 && (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  {searchTerm ? 'No Matching Members' : 'No Team Members'}
                </h3>
                <p className="text-slate-500 dark:text-slate-500 mb-4">
                  {searchTerm ? 'Try a different search term.' : 'Invite users to join your team.'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={openInviteModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    <UserPlus size={18} />
                    Invite First Member
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="space-y-4">
            {pendingInvitations.length === 0 ? (
              <div className="text-center py-12">
                <Send size={48} className="mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  No Pending Invitations
                </h3>
                <p className="text-slate-500 dark:text-slate-500 mb-4">
                  Invite users by email to join your team.
                </p>
                <button
                  onClick={openInviteModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  <UserPlus size={18} />
                  Send Invitation
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation._id} className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                          <Clock size={20} className="text-amber-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            {invitation.extensionUserId?.name || invitation.extensionUserId?.username || 'User'}
                          </h4>
                          <p className="text-sm text-slate-400">{invitation.email}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded">
                        Pending
                      </span>
                    </div>
                    {invitation.message && (
                      <p className="text-sm text-slate-400 mb-3 italic">"{invitation.message}"</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Sent {formatDate(invitation.createdAt)}</span>
                      <button
                        onClick={() => cancelInvite(invitation._id)}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <XCircle size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Invitations (all statuses) */}
            {invitations.filter(inv => inv.status !== 'pending').length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 text-slate-400">Past Invitations</h3>
                <div className="space-y-2">
                  {invitations.filter(inv => inv.status !== 'pending').map((invitation) => (
                    <div key={invitation._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          invitation.status === 'accepted' ? 'bg-emerald-500/20' :
                          invitation.status === 'rejected' ? 'bg-red-500/20' :
                          'bg-slate-500/20'
                        }`}>
                          {invitation.status === 'accepted' ? <UserCheck size={16} className="text-emerald-400" /> :
                           invitation.status === 'rejected' ? <XCircle size={16} className="text-red-400" /> :
                           <X size={16} className="text-slate-400" />}
                        </div>
                        <div>
                          <span className="font-medium">{invitation.email}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                            invitation.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                            invitation.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {invitation.status}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDate(invitation.respondedAt || invitation.updatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UserPlus size={22} />
                Invite Team Member
              </h2>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Error/Success Messages */}
              {inviteError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {inviteError}
                </div>
              )}
              {inviteSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                  <Check size={16} />
                  {inviteSuccess}
                </div>
              )}

              {/* Email Search */}
              <div>
                <label className="block text-sm font-medium mb-2">Search by Email</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setSearchResult(null);
                        setInviteError('');
                        setInviteSuccess('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && searchUserByEmail()}
                      className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg"
                      placeholder="user@example.com"
                    />
                  </div>
                  <button
                    onClick={searchUserByEmail}
                    disabled={searchLoading || !inviteEmail.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {searchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Search
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Search for existing extension users by their email
                </p>
              </div>

              {/* Search Result */}
              {searchResult && (
                <div className={`p-4 rounded-xl border ${
                  searchResult.canInvite 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : searchResult.found 
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-slate-500/10 border-slate-500/30'
                }`}>
                  {!searchResult.found && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-500/20 rounded-full flex items-center justify-center">
                        <AlertCircle size={24} className="text-slate-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-400">User Not Found</h4>
                        <p className="text-sm text-slate-500">
                          No extension user found with this email. They need to register with the extension first.
                        </p>
                      </div>
                    </div>
                  )}

                  {searchResult.alreadyInTeam && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <UserCheck size={24} className="text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{searchResult.user?.name || searchResult.user?.username}</h4>
                        <p className="text-sm text-emerald-400">Already in your team!</p>
                      </div>
                    </div>
                  )}

                  {searchResult.inOtherTeam && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <AlertCircle size={24} className="text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{searchResult.user?.name || searchResult.user?.username}</h4>
                        <p className="text-sm text-amber-400">Already belongs to another team</p>
                      </div>
                    </div>
                  )}

                  {searchResult.pendingInvite && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <Clock size={24} className="text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{searchResult.user?.name || searchResult.user?.username}</h4>
                        <p className="text-sm text-amber-400">Invitation already pending</p>
                      </div>
                    </div>
                  )}

                  {searchResult.canInvite && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <UserCheck size={24} className="text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{searchResult.user?.name || searchResult.user?.username}</h4>
                          <p className="text-sm text-slate-400">@{searchResult.user?.username}</p>
                          <p className="text-xs text-slate-500 mt-1">{searchResult.user?.events || 0} events tracked</p>
                        </div>
                      </div>

                      {/* Optional Message */}
                      <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">
                          Message (optional)
                        </label>
                        <textarea
                          value={inviteMessage}
                          onChange={(e) => setInviteMessage(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm resize-none"
                          rows={2}
                          placeholder="Add a personal message to your invitation..."
                        />
                      </div>

                      <button
                        onClick={sendInvite}
                        disabled={inviteLoading}
                        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                      >
                        {inviteLoading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            <Send size={18} />
                            Send Invitation
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors mt-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold">Edit Team Member</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitEdit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  disabled
                  className="w-full px-3 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Username cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password (leave blank to keep)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isActive" className="text-sm">Active</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Check size={16} />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-red-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Remove from Team?</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Are you sure you want to remove <strong>{selectedMember.name || selectedMember.username}</strong> from your team? 
                  They will no longer be part of this project but their account will remain active.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRemove}
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Remove
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
