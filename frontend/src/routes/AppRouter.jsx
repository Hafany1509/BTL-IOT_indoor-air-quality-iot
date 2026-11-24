import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { RoleGuard } from '../components/guards/RoleGuard';
import { MainLayout } from '../components/layout/MainLayout';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { LoginPage } from '../features/auth/page/LoginPage';
import { ForbiddenPage } from './ForbiddenPage';
import { NotFoundPage } from './NotFoundPage';

const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const TelemetryPage = lazy(() => import('../features/telemetry/pages/TelemetryPage').then(module => ({ default: module.TelemetryPage })));
const AlertsPage = lazy(() => import('../features/alerts/pages/AlertsPage').then(module => ({ default: module.AlertsPage })));
const ControlPage = lazy(() => import('../features/control/pages/ControlPage').then(module => ({ default: module.ControlPage })));
const AlertRulesPage = lazy(() => import('../features/alertRules/pages/AlertRulesPage').then(module => ({ default: module.AlertRulesPage })));
const UsersPage = lazy(() => import('../features/users/pages/UsersPage').then(module => ({ default: module.UsersPage })));
const DevicePage = lazy(() => import('../features/devices/pages/DevicePage').then(module => ({ default: module.DevicePage })));
const AuditLogsPage = lazy(() => import('../features/audit/pages/AuditLogsPage').then(module => ({ default: module.AuditLogsPage })));
const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
export function AppRouter() {
  return <Suspense fallback={<main className="standalone"><LoadingSkeleton /></main>}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="telemetry" element={<TelemetryPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route element={<RoleGuard roles={['ADMIN', 'OPERATOR']} />}>
          <Route path="control" element={<ControlPage />} />
          <Route path="device" element={<DevicePage />} />
        </Route>
        <Route element={<RoleGuard roles={['ADMIN']} />}>
          <Route path="alert-rules" element={<AlertRulesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
        </Route>
        <Route path="403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes></Suspense>;
}
