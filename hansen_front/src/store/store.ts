// src/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "@/slices/authSlice";
import { authApi } from "@/services/authApi";
import { contactsApi } from "@/services/contactsApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [contactsApi.reducerPath]: contactsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, contactsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
