import type { PermissionGroup } from "@/types/permissionGroup";
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export const permissionGroupApi = createApi({
  reducerPath: "permissionGroupApi",
  tagTypes: ["PermissionGroups"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    getPermissionsDomains: builder.query<PermissionGroup[], void>({
      query: () => ({
        url: "/permission-groups",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "PermissionGroups", id: "LIST" },
              ...result.map((d) => ({
                type: "PermissionGroups" as const,
                id: d.id,
              })),
            ]
          : [{ type: "PermissionGroups", id: "LIST" }],
    }),
  }),
});

export const { useGetPermissionsDomainsQuery } = permissionGroupApi;
