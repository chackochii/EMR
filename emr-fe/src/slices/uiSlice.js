import { createSlice, nanoid } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { toasts: [] },
  reducers: {
    addToast: {
      reducer(state, { payload }) {
        state.toasts.push(payload);
      },
      prepare({ type = 'info', message }) {
        return { payload: { id: nanoid(), type, message } };
      },
    },
    removeToast(state, { payload: id }) {
      state.toasts = state.toasts.filter((toast) => toast.id !== id);
    },
  },
});

export const { addToast, removeToast } = uiSlice.actions;
export default uiSlice.reducer;
