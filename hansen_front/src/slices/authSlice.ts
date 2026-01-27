import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { KeycloakTokenParsed } from "keycloak-js";
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

type AuthState = {
  status: AuthStatus;
  user: AppUser | null;
  error?: string;
};

const initialState: AuthState = {
  status: "idle",
  user: null,
};

function extractUserFromToken(token?: KeycloakTokenParsed): AppUser | null {
  if (!token) return null;

  // Keycloak standard claims (peuvent varier selon config)
  const roles =
    // realm_access.roles est très fréquent
    (token.realm_access?.roles as string[] | undefined) ?? [];

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
  // check-sso: ne force pas la redirection -> utile pour afficher /login
  const authenticated = await keycloak.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    checkLoginIframe: true,
  });

  return {
    authenticated,
    user: extractUserFromToken(keycloak.tokenParsed),
  };
});

export const login = createAsyncThunk("auth/login", async () => {
  // Redirection vers Keycloak
  await keycloak.login({
    redirectUri: window.location.origin,
  });
});

export const logout = createAsyncThunk("auth/logout", async () => {
  await keycloak.logout({
    redirectUri: `${window.location.origin}/login`,
  });
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Utile quand keycloak rafraîchit le token (plus tard on branchera proprement)
    setUserFromToken(
      state,
      action: PayloadAction<{ tokenParsed?: KeycloakTokenParsed }>
    ) {
      state.user = extractUserFromToken(action.payload.tokenParsed);
      state.status = state.user ? "authenticated" : "unauthenticated";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.pending, (state) => {
        state.status = "initializing";
        state.error = undefined;
      })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = action.payload.authenticated
          ? "authenticated"
          : "unauthenticated";
      })
      .addCase(initAuth.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Auth init failed";
      })

      // login/logout redirigent : ces states sont rarement visibles, mais on garde propre
      .addCase(login.pending, (state) => {
        state.error = undefined;
      })
      .addCase(logout.pending, (state) => {
        state.error = undefined;
      });
  },
});

export const { setUserFromToken } = authSlice.actions;
export const authReducer = authSlice.reducer;

// Selectors
export const selectAuthStatus = (s: { auth: AuthState }) => s.auth.status;
export const selectUser = (s: { auth: AuthState }) => s.auth.user;
