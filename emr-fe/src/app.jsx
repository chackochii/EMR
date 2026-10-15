import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import Toaster from './components/Toast';
import { restoreSession } from './slices/authSlice';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  return (
    <ErrorBoundary>
      <AppRoutes />
      <Toaster />
    </ErrorBoundary>
  );
}
