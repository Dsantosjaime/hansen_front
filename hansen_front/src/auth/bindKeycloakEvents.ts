import { setToken, setUser } from "@/slices/authSlice";
import type { Store } from "@reduxjs/toolkit";
import { keycloak } from "./keycloak";

export function bindKeycloakEvents(store: Store) {
  keycloak.onAuthSuccess = () => {
    store.dispatch(setToken(keycloak.token ?? null));
    store.dispatch(
      setUser(
        keycloak.tokenParsed
          ? {
              id: keycloak.tokenParsed.sub,
              username:
                (keycloak.tokenParsed.preferred_username as
                  | string
                  | undefined) ?? undefined,
              email: keycloak.tokenParsed.email as string | undefined,
              roles:
                (keycloak.tokenParsed.realm_access?.roles as
                  | string[]
                  | undefined) ?? [],
            }
          : null
      )
    );
  };

  keycloak.onAuthRefreshSuccess = () => {
    store.dispatch(setToken(keycloak.token ?? null));
  };

  keycloak.onAuthLogout = () => {
    store.dispatch(setToken(null));
    store.dispatch(setUser(null));
  };

  keycloak.onTokenExpired = () => {};
}
