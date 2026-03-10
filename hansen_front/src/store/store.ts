import { emailApi } from "@/services/emailApi";
import { contactsApi } from "@/services/contactsApi";
import { groupsApi } from "@/services/groupsApi";
import { permissionGroupApi } from "@/services/permissionGroupApi";
import { pluginParamsApi } from "@/services/pluginParamsApi";
import { rolesApi } from "@/services/rolesApi";
import { subGroupsApi } from "@/services/subgroupsApi";
import { todoApi } from "@/services/todoApi";
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
    [emailApi.reducerPath]: emailApi.reducer,
    [todoApi.reducerPath]: todoApi.reducer,
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
      emailApi.middleware,
      todoApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
