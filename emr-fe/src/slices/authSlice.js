import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authService } from '../services/authService';
import { refreshSession } from '../services/apiClient';
import { clearTokens, getRefreshToken, setTokens } from '../lib/tokenStorage';
import { extractApiError } from '../utils/extractApiError';

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { user, accessToken, refreshToken } = await authService.login(credentials);
    setTokens({ accessToken, refreshToken });
    return user;
  } catch (error) {
    return rejectWithValue(extractApiError(error, 'Unable to sign in. Please try again.'));
  }
});

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    if (!getRefreshToken()) return rejectWithValue(null);
    try {
      await refreshSession();
      return await authService.me();
    } catch {
      clearTokens();
      return rejectWithValue(null);
    }
  },
  {
    // Guards against React StrictMode double-invoking the bootstrap effect.
    condition: (_, { getState }) => {
      const { initialized, status } = getState().auth;
      return !initialized && status !== 'loading';
    },
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) await authService.logout(refreshToken);
  } catch {
    /* server-side revoke is best effort; local session is always cleared */
  }
  clearTokens();
});

const initialState = { user: null, status: 'idle', initialized: false, error: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired(state) {
      state.user = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.status = 'idle';
        state.user = payload;
        state.initialized = true;
      })
      .addCase(login.rejected, (state, { payload }) => {
        state.status = 'idle';
        state.error = payload || { message: 'Unable to sign in.', fieldErrors: {} };
      })
      .addCase(restoreSession.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(restoreSession.fulfilled, (state, { payload }) => {
        state.status = 'idle';
        state.user = payload;
        state.initialized = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = 'idle';
        state.initialized = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.error = null;
      });
  },
});

export const { sessionExpired } = authSlice.actions;
export const selectUser = (state) => state.auth.user;
export const selectAuthInitialized = (state) => state.auth.initialized;
export default authSlice.reducer;
