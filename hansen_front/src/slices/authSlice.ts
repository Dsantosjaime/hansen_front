// src/store/authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type User = { id: string; email: string; name: string }; // [PLACEHOLDER]

export type AuthState = {
  token: string | null;
  user: User | null;
};

const initialState: AuthState = { token: null, user: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (
      state,
      action: PayloadAction<{ token: string; user: User }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    clearSession: (state) => {
      state.token = null;
      state.user = null;
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export const authReducer = authSlice.reducer;
