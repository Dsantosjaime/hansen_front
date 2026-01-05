// src/services/authApi.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { clearSession, setSession, type AuthState } from "@/slices/authSlice";

type StateWithAuth = { auth: AuthState };

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "[PLACEHOLDER]https://api.example.com",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as StateWithAuth).auth.token;
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<
      { token: string; user: { id: string; email: string; name: string } },
      { email: string; password: string }
    >({
      async queryFn(arg) {
        return {
          data: {
            token: `poc_${Date.now()}`,
            user: { id: "u1", email: arg.email, name: "Gabin F" },
          },
        };
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setSession({ token: data.token, user: data.user }));
      },
    }),

    logout: builder.mutation<{ ok: true }, void>({
      async queryFn() {
        return { data: { ok: true } };
      },
      async onQueryStarted(_arg, { dispatch }) {
        dispatch(clearSession());
        dispatch(authApi.util.resetApiState());
      },
    }),

    getSession: builder.query<
      { token: string | null; user: { id: string; email: string } | null },
      void
    >({
      async queryFn(_arg, { getState }) {
        const state = getState() as StateWithAuth;
        return { data: { token: state.auth.token, user: state.auth.user } };
      },
    }),
  }),
});

export const { useGetSessionQuery, useLoginMutation, useLogoutMutation } =
  authApi;
