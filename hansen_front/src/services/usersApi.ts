import { User } from "@/types/user";
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type CreateUserInput = {
  email: string;
  name: string;
  roleId: string;
  temporaryPassword: string;
};

export type ModifyUserInput = {
  id: string;
  email?: string;
  name?: string;
  roleId?: string;
  temporaryPassword?: string;
};

export const usersApi = createApi({
  reducerPath: "usersApi",
  tagTypes: ["Users", "Me"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    getMe: builder.query<User, void>({
      query: () => ({
        url: "/users/me",
        method: "GET",
      }),
      providesTags: [{ type: "Me", id: "CURRENT" }],
    }),
    getUsers: builder.query<User[], void>({
      query: () => ({
        url: "/users",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "Users", id: "LIST" },
              ...result.map((u) => ({ type: "Users" as const, id: u.id })),
            ]
          : [{ type: "Users", id: "LIST" }],
    }),

    // POST /users
    createUser: builder.mutation<User, CreateUserInput>({
      query: (body) => ({
        url: "/users",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Users", id: "LIST" }],
    }),

    // PATCH /users/:id
    modifyUser: builder.mutation<User, ModifyUserInput>({
      query: ({ id, ...patch }) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Users", id: arg.id },
        { type: "Users", id: "LIST" },
        { type: "Me", id: "CURRENT" }, // au cas où l'user courant est modifié
      ],
    }),

    // DELETE /users/:id
    deleteUser: builder.mutation<User, { id: string }>({
      query: ({ id }) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Users", id: arg.id },
        { type: "Users", id: "LIST" },
        { type: "Me", id: "CURRENT" }, // idem
      ],
    }),
  }),
});

export const {
  useGetMeQuery,
  useGetUsersQuery,
  useCreateUserMutation,
  useModifyUserMutation,
  useDeleteUserMutation,
} = usersApi;
