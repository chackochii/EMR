import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import { LoadingState } from '../components/Loading';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { ROUTES } from '../constants/routes';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const SchedulerPage = lazy(() => import('../pages/SchedulerPage'));
const BookAppointmentPage = lazy(() => import('../pages/BookAppointmentPage'));
const AppointmentListPage = lazy(() => import('../pages/AppointmentListPage'));
const DoctorSchedulePage = lazy(() => import('../pages/DoctorSchedulePage'));
const UsersPage = lazy(() => import('../pages/UsersPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.SCHEDULER} element={<SchedulerPage />} />
            <Route path={ROUTES.APPOINTMENTS} element={<AppointmentListPage />} />
            <Route element={<RoleRoute capability="BOOK" />}>
              <Route path={ROUTES.BOOK} element={<BookAppointmentPage />} />
            </Route>
            <Route element={<RoleRoute capability="DOCTOR_SCHEDULE" />}>
              <Route path={ROUTES.DOCTOR_SCHEDULE} element={<DoctorSchedulePage />} />
            </Route>
            <Route element={<RoleRoute capability="USERS" />}>
              <Route path={ROUTES.USERS} element={<UsersPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
