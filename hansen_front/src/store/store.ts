// src/store/store.ts
import { contactsApi } from "@/services/contactsApi";
import { emailsApi } from "@/services/emailsApi";
import { permissionGroupApi } from "@/services/permissionGroupApi";
import { pluginParamsApi } from "@/services/pluginParamsApi";
import { rolesApi } from "@/services/rolesApi";
import { usersApi } from "@/services/usersApi";
import { authReducer } from "@/slices/authSlice";
import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [contactsApi.reducerPath]: contactsApi.reducer,
    [permissionGroupApi.reducerPath]: permissionGroupApi.reducer,
    [rolesApi.reducerPath]: rolesApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [pluginParamsApi.reducerPath]: pluginParamsApi.reducer,
    [emailsApi.reducerPath]: emailsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      contactsApi.middleware,
      permissionGroupApi.middleware,
      rolesApi.middleware,
      usersApi.middleware,
      pluginParamsApi.middleware,
      emailsApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
