// src/store/store.ts
import { contactsApi } from "@/services/contactsApi";
import { emailsApi } from "@/services/emailsApi";
import { permissionDomainsApi } from "@/services/permissionDomainsApi";
import { pluginParamsApi } from "@/services/pluginParamsApi";
import { userRulesGroupsApi } from "@/services/userRulesGroupsApi";
import { usersApi } from "@/services/usersApi";
import { authReducer } from "@/slices/authSlice";
import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [contactsApi.reducerPath]: contactsApi.reducer,
    [permissionDomainsApi.reducerPath]: permissionDomainsApi.reducer,
    [userRulesGroupsApi.reducerPath]: userRulesGroupsApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [pluginParamsApi.reducerPath]: pluginParamsApi.reducer,
    [emailsApi.reducerPath]: emailsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
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
