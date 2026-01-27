// src/store/authSlice.ts
import { getWebRedirectUri } from "@/auth/webUrl";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { KeycloakTokenParsed } from "keycloak-js";
import { Platform } from "react-native";
import { keycloak } from "../auth/keycloak";

export type AuthStatus =
  | "idle"
  | "initializing"
  | "authenticated"
  | "unauthenticated"
  | "error";

export type AppUser = {
  id?: string;
  username?: string;
  email?: string;
  roles: string[];
};

export type AuthState = {
  status: AuthStatus;
  token: string | null;
  user: AppUser | null;
  error?: string;
};

const initialState: AuthState = {
  status: "idle",
  token: null,
  user: null,
};

function extractUserFromToken(token?: KeycloakTokenParsed): AppUser | null {
  if (!token) return null;
  const roles = (token.realm_access?.roles as string[] | undefined) ?? [];

  return {
    id: token.sub,
    username:
      (token.preferred_username as string | undefined) ??
      (token.name as string | undefined),
    email: token.email as string | undefined,
    roles,
  };
}

export const initAuth = createAsyncThunk("auth/init", async () => {
  if (Platform.OS !== "web") {
    return {
      authenticated: false,
      token: null as string | null,
      user: null as AppUser | null,
    };
  }

  const authenticated = await keycloak.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    checkLoginIframe: true,
  });

  return {
    authenticated,
    token: keycloak.token ?? null,
    user: extractUserFromToken(keycloak.tokenParsed),
  };
});

export const login = createAsyncThunk("auth/login", async () => {
  if (Platform.OS !== "web") return;
  await keycloak.login({
    redirectUri: getWebRedirectUri("/"),
  });
});

export const logout = createAsyncThunk("auth/logout", async () => {
  if (Platform.OS !== "web") return;
  await keycloak.logout({
    redirectUri: getWebRedirectUri("/auth"),
  });
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken(state, action: { payload: string | null }) {
      state.token = action.payload;
      state.status = action.payload ? "authenticated" : "unauthenticated";
    },
    setUser(state, action: { payload: AppUser | null }) {
      state.user = action.payload;
    },
    syncFromKeycloak(state) {
      state.token = keycloak.token ?? null;
      state.user = extractUserFromToken(keycloak.tokenParsed);
      state.status = state.token ? "authenticated" : "unauthenticated";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.pending, (state) => {
        state.status = "initializing";
        state.error = undefined;
      })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.status = action.payload.authenticated
          ? "authenticated"
          : "unauthenticated";
      })
      .addCase(initAuth.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Auth init failed";
      });
  },
});

export const { setToken, setUser, syncFromKeycloak } = authSlice.actions;
export const authReducer = authSlice.reducer;

// selectors
export const selectAuthToken = (s: { auth: AuthState }) => s.auth.token;
export const selectAuthStatus = (s: { auth: AuthState }) => s.auth.status;
export const selectUser = (s: { auth: AuthState }) => s.auth.user;
