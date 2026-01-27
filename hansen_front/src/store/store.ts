// src/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "@/slices/authSlice";
import { authApi } from "@/services/authApi";
import { contactsApi } from "@/services/contactsApi";
import { permissionDomainsApi } from "@/services/permissionDomainsApi";
import { userRulesGroupsApi } from "@/services/userRulesGroupsApi";
import { usersApi } from "@/services/usersApi";
import { pluginParamsApi } from "@/services/pluginParamsApi";
import { emailsApi } from "@/services/emailsApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [contactsApi.reducerPath]: contactsApi.reducer,
    [permissionDomainsApi.reducerPath]: permissionDomainsApi.reducer,
    [userRulesGroupsApi.reducerPath]: userRulesGroupsApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [pluginParamsApi.reducerPath]: pluginParamsApi.reducer,
    [emailsApi.reducerPath]: emailsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      contactsApi.middleware,
      permissionDomainsApi.middleware,
      userRulesGroupsApi.middleware,
      usersApi.middleware,
      pluginParamsApi.middleware,
      emailsApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
