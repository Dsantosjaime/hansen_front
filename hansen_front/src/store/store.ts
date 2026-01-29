// src/store/store.ts
import { contactsApi } from "@/services/contactsApi";
import { emailsApi } from "@/services/emailsApi";
import { groupsApi } from "@/services/groupsApi";
import { permissionGroupApi } from "@/services/permissionGroupApi";
import { pluginParamsApi } from "@/services/pluginParamsApi";
import { rolesApi } from "@/services/rolesApi";
import { subGroupsApi } from "@/services/subgroupsApi";
import { usersApi } from "@/services/usersApi";
import { authReducer } from "@/slices/authSlice";
import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [subGroupsApi.reducerPath]: subGroupsApi.reducer,
    [groupsApi.reducerPath]: groupsApi.reducer,
    [contactsApi.reducerPath]: contactsApi.reducer,
    [permissionGroupApi.reducerPath]: permissionGroupApi.reducer,
    [rolesApi.reducerPath]: rolesApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [pluginParamsApi.reducerPath]: pluginParamsApi.reducer,
    [emailsApi.reducerPath]: emailsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      subGroupsApi.middleware,
      groupsApi.middleware,
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
