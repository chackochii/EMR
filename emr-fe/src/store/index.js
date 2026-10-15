import { configureStore } from '@reduxjs/toolkit';
import authReducer, { sessionExpired } from '../slices/authSlice';
import uiReducer, { addToast } from '../slices/uiSlice';
import { setAuthFailureHandler } from '../services/apiClient';

export const store = configureStore({
  reducer: { auth: authReducer, ui: uiReducer },
});

setAuthFailureHandler(() => {
  store.dispatch(sessionExpired());
  store.dispatch(addToast({ type: 'error', message: 'Your session has expired. Please sign in again.' }));
});
