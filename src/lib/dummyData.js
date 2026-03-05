// Sample dummy data for the Tracking MVP UI. Replace with real API data later.

export const demoClients = [
  {
    id: 'client_001',
    name: 'Acme Corp',
    domain: 'acme.com',
    plan: 'Pro',
    createdAt: '2024-09-18T09:24:00Z',
  },
  {
    id: 'client_002',
    name: 'Globex',
    domain: 'globex.io',
    plan: 'Business',
    createdAt: '2024-12-02T11:12:00Z',
  },
  {
    id: 'client_003',
    name: 'Initech',
    domain: 'initech.app',
    plan: 'Starter',
    createdAt: '2025-01-22T17:35:00Z',
  },
];

export const demoSessions = [
  {
    id: 'sess_1001',
    clientId: 'client_001',
    userId: 'user_01',
    device: 'Desktop',
    browser: 'Chrome',
    country: 'US',
    startedAt: '2025-09-24T10:21:00Z',
    durationSec: 524,
    actions: [
      { id: 'a1', type: 'pageview', label: '/', ts: '2025-09-24T10:21:03Z' },
      { id: 'a2', type: 'click', label: '#signup-btn', ts: '2025-09-24T10:22:11Z' },
      { id: 'a3', type: 'input', label: 'email', ts: '2025-09-24T10:22:35Z' },
      { id: 'a4', type: 'click', label: '#submit', ts: '2025-09-24T10:23:02Z' },
    ],
    screenshots: [
      '/screenshots/mock1.png',
      '/screenshots/mock2.png',
      '/screenshots/mock3.png',
    ],
  },
  {
    id: 'sess_1002',
    clientId: 'client_001',
    userId: 'user_02',
    device: 'Mobile',
    browser: 'Safari',
    country: 'GB',
    startedAt: '2025-09-24T12:05:00Z',
    durationSec: 301,
    actions: [
      { id: 'b1', type: 'pageview', label: '/pricing', ts: '2025-09-24T12:05:04Z' },
      { id: 'b2', type: 'click', label: '.cta-primary', ts: '2025-09-24T12:05:40Z' },
      { id: 'b3', type: 'scroll', label: '75%', ts: '2025-09-24T12:06:10Z' },
    ],
    screenshots: ['/screenshots/mock4.png'],
  },
];

export const demoAnalytics = {
  sessionsOverTime: [
    { date: '2025-09-20', sessions: 42 },
    { date: '2025-09-21', sessions: 58 },
    { date: '2025-09-22', sessions: 64 },
    { date: '2025-09-23', sessions: 71 },
    { date: '2025-09-24', sessions: 67 },
    { date: '2025-09-25', sessions: 79 },
  ],
  deviceBreakdown: [
    { name: 'Desktop', value: 62 },
    { name: 'Mobile', value: 28 },
    { name: 'Tablet', value: 10 },
  ],
};

export const demoMetrics = {
  totalSessions: 1240,
  activeUsers: 186,
  avgTimeSec: 412,
  screenshots: 384,
};

export const demoAdminMetrics = {
  totalClients: demoClients.length,
  totalSessions: 4280,
  avgSessionDurationSec: 368,
};

export const demoPluginSnippet = (
  '<script src="https://tracking-mvp.js" data-client="CLIENT_ID"></script>'
);


