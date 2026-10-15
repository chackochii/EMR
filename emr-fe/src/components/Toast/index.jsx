import { memo, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Icon from '../Icon';
import { removeToast } from '../../slices/uiSlice';

const TOAST_DURATION_MS = 4500;
const TOAST_ICONS = { success: 'check-circle', error: 'alert-circle', info: 'info' };

const ToastItem = memo(function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <li className={`toast toast--${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      <span className="toast__icon" aria-hidden="true">
        <Icon name={TOAST_ICONS[toast.type] || 'info'} size={18} />
      </span>
      <span className="toast__message">{toast.message}</span>
      <button type="button" className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
        <Icon name="x" size={16} />
      </button>
    </li>
  );
});

export default function Toaster() {
  const toasts = useSelector((state) => state.ui.toasts);
  const dispatch = useDispatch();
  const dismiss = useCallback((id) => dispatch(removeToast(id)), [dispatch]);

  return (
    <ul className="toaster" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </ul>
  );
}
