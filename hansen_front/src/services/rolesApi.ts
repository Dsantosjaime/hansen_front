import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type Permission = {
  subject: string; // "Post"
  action: string; // "create"
};

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
};

export type CreateRoleDto = {
  name: string;
  permissions: Permission[];
};

export type UpdateRoleDto = Partial<CreateRoleDto>;

export const rolesApi = createApi({
  reducerPath: "rolesApi",
  tagTypes: ["Roles"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    // GET /roles
    getRoles: builder.query<Role[], void>({
      query: () => ({
        url: "/roles",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "Roles", id: "LIST" },
              ...result.map((r) => ({ type: "Roles" as const, id: r.id })),
            ]
          : [{ type: "Roles", id: "LIST" }],
    }),

    // GET /roles/:id
    getRoleById: builder.query<Role, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _err, id) => [{ type: "Roles", id }],
    }),

    // POST /roles
    createRole: builder.mutation<Role, CreateRoleDto>({
      query: (body) => ({
        url: "/roles",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Roles", id: "LIST" }],
    }),

    // PATCH /roles/:id
    updateRole: builder.mutation<Role, { id: string; data: UpdateRoleDto }>({
      query: ({ id, data }) => ({
        url: `/roles/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: "Roles", id: "LIST" },
        { type: "Roles", id },
      ],
    }),

    // DELETE /roles/:id
    deleteRole: builder.mutation<{ id: string }, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _err, id) => [
        { type: "Roles", id: "LIST" },
        { type: "Roles", id },
      ],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = rolesApi;
