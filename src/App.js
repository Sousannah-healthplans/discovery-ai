import { Routes, Route, Navigate } from 'react-router-dom';
import { roles } from './lib/utils';
import { RequireAuth, useAuth } from './auth/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import ScheduleDemo from './pages/ScheduleDemo';
import ClientHome from './pages/client/ClientHome';
import ClientSessions from './pages/client/ClientSessions';
import ClientSessionDetail from './pages/client/ClientSessionDetail';
import ClientTabs from './pages/client/ClientTabs';
import ClientScreens from './pages/client/ClientScreens';
import ClientAnalytics from './pages/client/ClientAnalytics';
import ClientEvents from './pages/client/ClientEvents';
import ClientSettings from './pages/client/ClientSettings';
import ClientClaims from './pages/client/ClientClaims';
import ClientTeam from './pages/client/ClientTeam';
import AdminHome from './pages/admin/AdminHome';
import AdminClients from './pages/admin/AdminClients';
import AdminClientDetail from './pages/admin/AdminClientDetail';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminUsersAnalytics from './pages/admin/AdminUsersAnalytics';
import AdminUsers from './pages/admin/AdminUsers';
import AdminClaims from './pages/admin/AdminClaims';
import PMHome from './pages/pm/PMHome';
import PMTeam from './pages/pm/PMTeam';
import PMUsers from './pages/pm/PMUsers';
import PMUserDetail from './pages/pm/PMUserDetail';
import PMSessions from './pages/pm/PMSessions';
import PMSessionDetail from './pages/pm/PMSessionDetail';
import PMScreenshots from './pages/pm/PMScreenshots';
import PMRemoteSessions from './pages/pm/PMRemoteSessions';
import PMAnalytics from './pages/pm/PMAnalytics';
import PMClaims from './pages/pm/PMClaims';
import ExtLogin from './pages/ExtLogin';
import ExtDashboard from './pages/ExtDashboard';

function RedirectByRole() {
  const { user } = useAuth();
  console.log('[RedirectByRole] Current user:', { 
    user, 
    role: user?.role, 
    roles, 
    isAdmin: user?.role === roles.ADMIN,
    isPM: user?.role === roles.PROJECT_MANAGER
  });
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === roles.ADMIN) {
    console.log('[RedirectByRole] Redirecting to /admin');
    return <Navigate to="/admin" replace />;
  }
  if (user.role === roles.PROJECT_MANAGER) {
    console.log('[RedirectByRole] Redirecting to /pm');
    return <Navigate to="/pm" replace />;
  }
  console.log('[RedirectByRole] Redirecting to /client');
  return <Navigate to="/client" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/schedule-demo" element={<ScheduleDemo />} />
      <Route path="/client" element={<RequireAuth allowed={[roles.CLIENT, roles.ADMIN]}><ClientHome /></RequireAuth>} />
      <Route path="/client/sessions" element={<RequireAuth allowed={[roles.CLIENT, roles.ADMIN]}><ClientSessions /></RequireAuth>} />
      <Route path="/client/sessions/:id" element={<RequireAuth allowed={[roles.CLIENT, roles.ADMIN]}><ClientSessionDetail /></RequireAuth>} />
      <Route path="/client/tabs" element={<RequireAuth allowed={[roles.CLIENT, roles.ADMIN]}><ClientTabs /></RequireAuth>} />
      <Route path="/client/screenshots" element={<RequireAuth allowed={[roles.CLIENT, roles.ADMIN]}><ClientScreens /></RequireAuth>} />
      <Route path="/client/analytics" element={<RequireAuth allowed={[roles.CLIENT, roles.ADMIN]}><ClientAnalytics /></RequireAuth>} />
      <Route path="/client/events" element={<RequireAuth allowed={[roles.CLIENT, roles.ADMIN]}><ClientEvents /></RequireAuth>} />
      <Route path="/client/settings" element={<RequireAuth allowed={[roles.CLIENT, roles.ADMIN]}><ClientSettings /></RequireAuth>} />
      <Route path="/client/team" element={<RequireAuth allowed={[roles.CLIENT, roles.ADMIN]}><ClientTeam /></RequireAuth>} />
      <Route path="/client/claims" element={<RequireAuth allowed={[roles.CLIENT, roles.ADMIN]}><ClientClaims /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth allowed={[roles.ADMIN]}><AdminHome /></RequireAuth>} />
      <Route path="/admin/clients" element={<RequireAuth allowed={[roles.ADMIN]}><AdminClients /></RequireAuth>} />
      <Route path="/admin/clients/:id" element={<RequireAuth allowed={[roles.ADMIN]}><AdminClientDetail /></RequireAuth>} />
      <Route path="/admin/analytics" element={<RequireAuth allowed={[roles.ADMIN]}><AdminAnalytics /></RequireAuth>} />
      <Route path="/admin/users-analytics" element={<RequireAuth allowed={[roles.ADMIN]}><AdminUsersAnalytics /></RequireAuth>} />
      <Route path="/admin/users" element={<RequireAuth allowed={[roles.ADMIN]}><AdminUsers /></RequireAuth>} />
      <Route path="/admin/claims" element={<RequireAuth allowed={[roles.ADMIN]}><AdminClaims /></RequireAuth>} />
      {/* Project Manager routes */}
      <Route path="/pm" element={<RequireAuth allowed={[roles.PROJECT_MANAGER, roles.ADMIN]}><PMHome /></RequireAuth>} />
      <Route path="/pm/team" element={<RequireAuth allowed={[roles.PROJECT_MANAGER, roles.ADMIN]}><PMTeam /></RequireAuth>} />
      <Route path="/pm/users" element={<RequireAuth allowed={[roles.PROJECT_MANAGER, roles.ADMIN]}><PMUsers /></RequireAuth>} />
      <Route path="/pm/users/:id" element={<RequireAuth allowed={[roles.PROJECT_MANAGER, roles.ADMIN]}><PMUserDetail /></RequireAuth>} />
      <Route path="/pm/sessions" element={<RequireAuth allowed={[roles.PROJECT_MANAGER, roles.ADMIN]}><PMSessions /></RequireAuth>} />
      <Route path="/pm/sessions/:userId/:sessionId" element={<RequireAuth allowed={[roles.PROJECT_MANAGER, roles.ADMIN]}><PMSessionDetail /></RequireAuth>} />
      <Route path="/pm/screenshots" element={<RequireAuth allowed={[roles.PROJECT_MANAGER, roles.ADMIN]}><PMScreenshots /></RequireAuth>} />
      <Route path="/pm/claims" element={<RequireAuth allowed={[roles.PROJECT_MANAGER, roles.ADMIN]}><PMClaims /></RequireAuth>} />
      <Route path="/pm/remote-sessions" element={<RequireAuth allowed={[roles.PROJECT_MANAGER, roles.ADMIN]}><PMRemoteSessions /></RequireAuth>} />
      <Route path="/pm/analytics" element={<RequireAuth allowed={[roles.PROJECT_MANAGER, roles.ADMIN]}><PMAnalytics /></RequireAuth>} />
      {/* Extension user views */}
      <Route path="/ext-login" element={<ExtLogin />} />
      <Route path="/ext-dashboard" element={<ExtDashboard />} />
      <Route path="/redirect" element={<RedirectByRole />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

