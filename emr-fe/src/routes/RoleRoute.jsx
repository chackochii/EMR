import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';

/** Renders child routes only when the user holds `capability` (see constants/roles ACCESS). */
export default function RoleRoute({ capability }) {
  const { can } = useAuth();
  return can(capability) ? <Outlet /> : <Navigate to={ROUTES.DASHBOARD} replace />;
}
