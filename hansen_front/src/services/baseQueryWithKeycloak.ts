import { keycloak } from "@/auth/keycloak";
import { setToken } from "@/slices/authSlice";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";

const mutex = new Mutex();

export type StateWithAuth = { auth: { token: string | null } };

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as StateWithAuth).auth.token;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

export const baseQueryWithKeycloakRefresh: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  await mutex.waitForUnlock();

  if (keycloak.authenticated) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refreshed = await keycloak.updateToken(30);
        if (refreshed) {
          api.dispatch(setToken(keycloak.token ?? null));
        }
      } catch {
        api.dispatch(setToken(null));
      } finally {
        release();
      }
    }
  }

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && keycloak.authenticated) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        await keycloak.updateToken(0);
        api.dispatch(setToken(keycloak.token ?? null));
      } catch {
        api.dispatch(setToken(null));
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();
    }

    result = await rawBaseQuery(args, api, extraOptions);
  }

  return result;
};
