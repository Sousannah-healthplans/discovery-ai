// Helper to normalize URLs and fix double slashes
function normalizeUrl(url) {
  if (!url) return url
  // Remove trailing slash
  url = url.replace(/\/+$/, '')
  // Fix double slashes (but keep ://)
  url = url.replace(/([^:]\/)\/+/g, '$1')
  return url
}

export async function apiGet(path, token, apiKey, projectId) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (apiKey) headers['x-api-key'] = apiKey
  
  let url = normalizeUrl(path)
  
  if (projectId) {
    const separator = url.includes('?') ? '&' : '?'
    url = `${url}${separator}projectId=${encodeURIComponent(projectId)}`
  }
  
  const res = await fetch(url, { headers })
  if (!res.ok) {
    // Handle 401 Unauthorized (expired token)
    if (res.status === 401) {
      const error = new Error('Unauthorized - Token expired')
      error.status = 401
      throw error
    }
    throw new Error('Request failed')
  }
  return res.json()
}

export async function apiJson(method, path, token, body, apiKey, projectId) {
  const headers = {
    'content-type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (apiKey) headers['x-api-key'] = apiKey
  
  let url = normalizeUrl(path)
  if (projectId) {
    const separator = url.includes('?') ? '&' : '?'
    url = `${url}${separator}projectId=${encodeURIComponent(projectId)}`
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    // Handle 401 Unauthorized (expired token)
    if (res.status === 401) {
      const error = new Error('Unauthorized - Token expired')
      error.status = 401
      throw error
    }
    throw new Error('Request failed')
  }
  return res.json()
}

export async function fetchOverview(baseUrl, projectId, token, apiKey) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/analytics/overview`, token, apiKey, projectId)
}

export async function fetchSessions(baseUrl, projectId, token, limit = 100, apiKey) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/analytics/sessions?limit=${limit}`, token, apiKey, projectId)
}

export async function fetchEvents(baseUrl, projectId, token, type, limit = 200, apiKey, sessionId = null) {
  const base = normalizeUrl(baseUrl)
  const q = new URLSearchParams({ limit: String(limit) })
  if (type) q.set('type', type)
  if (sessionId) q.set('sessionId', sessionId)
  return apiGet(`${base}/api/analytics/events?${q.toString()}`, token, apiKey, projectId)
}

export async function fetchScreenshots(baseUrl, projectId, token, limit = 100, apiKey, sessionId = null) {
  const base = normalizeUrl(baseUrl)
  const q = new URLSearchParams({ limit: String(limit) })
  if (sessionId) q.set('sessionId', sessionId)
  return apiGet(`${base}/api/analytics/screenshots?${q.toString()}`, token, apiKey, projectId)
}

export async function fetchTabs(baseUrl, projectId, token, apiKey) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/analytics/tabs`, token, apiKey, projectId)
}

// Admin APIs - Extension Users
export async function adminFetchUsers(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/admin/analytics/users`, token)
}

export async function adminFetchOverview(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/admin/analytics/overview`, token)
}

// User-specific admin APIs (userId is the trackerUserId)
export async function adminFetchUserOverview(baseUrl, userId, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/admin/analytics/users/${encodeURIComponent(userId)}/overview`, token)
}

export async function adminFetchUserSessions(baseUrl, userId, token, limit = 1000) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/admin/analytics/users/${encodeURIComponent(userId)}/sessions?limit=${limit}`, token)
}

export async function adminFetchUserEvents(baseUrl, userId, token, type, limit = 500) {
  const base = normalizeUrl(baseUrl)
  const q = new URLSearchParams({ limit: String(limit) })
  if (type) q.set('type', type)
  return apiGet(`${base}/api/admin/analytics/users/${encodeURIComponent(userId)}/events?${q.toString()}`, token)
}

// Admin-specific function to fetch screenshots for a specific user
export async function adminFetchUserScreenshots(baseUrl, userId, token, limit = 500) {
  // Use the user events endpoint with type='screenshot'
  // This bypasses the logged-in user filter and gets screenshots for the specified userId
  return adminFetchUserEvents(baseUrl, userId, token, 'screenshot', limit)
}

// Legacy compatibility - map to extension users
export async function fetchMySites(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/sites`, token)
}

// Legacy admin APIs - kept for backward compatibility but map to extension users
export async function adminFetchSites(baseUrl, token) {
  // Return extension users in site-like format
  const users = await adminFetchUsers(baseUrl, token)
  return users.map(u => ({
    projectId: u.userId,
    name: `Extension User ${u.userId?.slice(0, 8)}`,
    domain: 'browser-extension',
    userId: u.userId,
    events: u.events,
    firstTs: u.firstTs,
    lastTs: u.lastTs
  }))
}

export async function adminFetchSiteOverview(baseUrl, userId, token) {
  return adminFetchUserOverview(baseUrl, userId, token)
}

export async function adminFetchSiteSessions(baseUrl, userId, token, limit = 1000) {
  return adminFetchUserSessions(baseUrl, userId, token, limit)
}

export async function adminFetchSiteEvents(baseUrl, userId, token, type, limit = 500) {
  return adminFetchUserEvents(baseUrl, userId, token, type, limit)
}

// ===== Project Manager APIs =====

// Get all team members (extension users) in the project
export async function pmFetchTeam(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/team`, token)
}

// Create a new team member
export async function pmCreateTeamMember(baseUrl, token, memberData) {
  const base = normalizeUrl(baseUrl)
  return apiJson('POST', `${base}/api/pm/team`, token, memberData)
}

// Update a team member
export async function pmUpdateTeamMember(baseUrl, token, memberId, memberData) {
  const base = normalizeUrl(baseUrl)
  return apiJson('PUT', `${base}/api/pm/team/${encodeURIComponent(memberId)}`, token, memberData)
}

// Delete a team member
export async function pmDeleteTeamMember(baseUrl, token, memberId) {
  const base = normalizeUrl(baseUrl)
  return apiJson('DELETE', `${base}/api/pm/team/${encodeURIComponent(memberId)}`, token)
}

// Get project overview
export async function pmFetchOverview(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/overview`, token)
}

// Get users with analytics
export async function pmFetchUsers(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/users`, token)
}

// Get user overview
export async function pmFetchUserOverview(baseUrl, userId, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/users/${encodeURIComponent(userId)}/overview`, token)
}

// Get user sessions
export async function pmFetchUserSessions(baseUrl, userId, token, limit = 100) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/users/${encodeURIComponent(userId)}/sessions?limit=${limit}`, token)
}

// Get user events
export async function pmFetchUserEvents(baseUrl, userId, token, type, limit = 500, sessionId) {
  const base = normalizeUrl(baseUrl)
  const q = new URLSearchParams({ limit: String(limit) })
  if (type) q.set('type', type)
  if (sessionId) q.set('sessionId', sessionId)
  return apiGet(`${base}/api/pm/users/${encodeURIComponent(userId)}/events?${q.toString()}`, token)
}

// Get all sessions for the project
export async function pmFetchSessions(baseUrl, token, limit = 100) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/sessions?limit=${limit}`, token)
}

// Get all screenshots for the project
export async function pmFetchScreenshots(baseUrl, token, limit = 100) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/screenshots?limit=${limit}`, token)
}

// Get all events for the project
export async function pmFetchEvents(baseUrl, token, type, limit = 200) {
  const base = normalizeUrl(baseUrl)
  const q = new URLSearchParams({ limit: String(limit) })
  if (type) q.set('type', type)
  return apiGet(`${base}/api/pm/events?${q.toString()}`, token)
}

// ===== PM Claims (OCR-derived) =====

export async function pmFetchClaims(baseUrl, token, limit = 500) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/claims?limit=${limit}`, token)
}

export async function pmFetchClaimAnalytics(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/claims/analytics`, token)
}

/** POST export; returns Blob (XLSX) for download. Throw on error. */
export async function pmExportClaimsCsv(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  const url = `${base}/api/pm/claims/export`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: '{}'
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.details || err.error || 'Export failed')
  }
  return res.blob()
}

export async function pmFetchClaimDetail(baseUrl, token, claimId) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/claims/${encodeURIComponent(claimId)}`, token)
}

export async function pmReprocessClaims(baseUrl, token, limit = 100) {
  const base = normalizeUrl(baseUrl)
  return apiJson('POST', `${base}/api/pm/claims/reprocess`, token, { limit })
}


// ===== PM Remote Control (Stealth) APIs =====

// Send a remote command to a specific extension user
export async function pmSendRemoteCommand(baseUrl, token, trackerUserId, command, sessionName) {
  const base = normalizeUrl(baseUrl)
  return apiJson('POST', `${base}/api/pm/remote-command`, token, { trackerUserId, command, sessionName })
}

// Send a bulk remote command to multiple users
export async function pmSendBulkRemoteCommand(baseUrl, token, trackerUserIds, command, sessionName) {
  const base = normalizeUrl(baseUrl)
  return apiJson('POST', `${base}/api/pm/remote-command/bulk`, token, { trackerUserIds, command, sessionName })
}

// Get stealth tracking status for a user
export async function pmGetRemoteStatus(baseUrl, token, trackerUserId) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/remote-status/${encodeURIComponent(trackerUserId)}`, token)
}

// ===== PM Invitation APIs =====

// Search for extension user by email
export async function pmSearchUserByEmail(baseUrl, token, email) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/invitations/search?email=${encodeURIComponent(email)}`, token)
}

// Send invitation to join team
export async function pmSendInvitation(baseUrl, token, invitationData) {
  const base = normalizeUrl(baseUrl)
  return apiJson('POST', `${base}/api/pm/invitations`, token, invitationData)
}

// Get all invitations for the project
export async function pmFetchInvitations(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/pm/invitations`, token)
}

// Cancel an invitation
export async function pmCancelInvitation(baseUrl, token, invitationId) {
  const base = normalizeUrl(baseUrl)
  return apiJson('DELETE', `${base}/api/pm/invitations/${encodeURIComponent(invitationId)}`, token)
}

// ===== Extension User Invitation APIs =====

// Get pending invitations for logged-in extension user
export async function extFetchInvitations(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/ext-auth/invitations`, token)
}

// Accept invitation
export async function extAcceptInvitation(baseUrl, token, invitationId) {
  const base = normalizeUrl(baseUrl)
  return apiJson('POST', `${base}/api/ext-auth/invitations/${encodeURIComponent(invitationId)}/accept`, token)
}

// Reject invitation
export async function extRejectInvitation(baseUrl, token, invitationId) {
  const base = normalizeUrl(baseUrl)
  return apiJson('POST', `${base}/api/ext-auth/invitations/${encodeURIComponent(invitationId)}/reject`, token)
}

// Leave team
export async function extLeaveTeam(baseUrl, token) {
  const base = normalizeUrl(baseUrl)
  return apiJson('POST', `${base}/api/ext-auth/leave-team`, token)
}

// Claims APIs
export async function listClaims(baseUrl, token, projectId, apiKey) {
  const base = normalizeUrl(baseUrl)
  return apiGet(`${base}/api/claims`, token, apiKey, projectId)
}

export async function createClaim(baseUrl, token, payload, apiKey, projectId) {
  const base = normalizeUrl(baseUrl)
  return apiJson('POST', `${base}/api/claims`, token, payload, apiKey, projectId)
}

export async function updateClaim(baseUrl, token, id, update, apiKey, projectId) {
  const base = normalizeUrl(baseUrl)
  return apiJson('PUT', `${base}/api/claims/${encodeURIComponent(id)}`, token, update, apiKey, projectId)
}

export async function deleteClaim(baseUrl, token, id, apiKey, projectId) {
  const base = normalizeUrl(baseUrl)
  return apiJson('DELETE', `${base}/api/claims/${encodeURIComponent(id)}`, token, null, apiKey, projectId)
}


