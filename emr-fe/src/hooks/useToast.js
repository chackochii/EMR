import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { addToast } from '../slices/uiSlice';

export function useToast() {
  const dispatch = useDispatch();
  return useMemo(
    () => ({
      success: (message) => dispatch(addToast({ type: 'success', message })),
      error: (message) => dispatch(addToast({ type: 'error', message })),
      info: (message) => dispatch(addToast({ type: 'info', message })),
    }),
    [dispatch],
  );
}
