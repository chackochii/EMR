import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LoadingState } from '../components/Loading';
import { ROUTES } from '../constants/routes';

export default function ProtectedRoute() {
  const location = useLocation();
  const { user, initialized } = useSelector((state) => state.auth);

  if (!initialized) return <LoadingState label="Restoring your session…" />;
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <Outlet />;
}
