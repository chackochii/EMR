import { useSelector } from 'react-redux';
import { hasAccess } from '../constants/roles';
import { selectUser } from '../slices/authSlice';

export function useAuth() {
  const user = useSelector(selectUser);
  return { user, role: user?.role, can: (capability) => hasAccess(user?.role, capability) };
}
