import { User } from "@/types/user";
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type CreateUserInput = {
  email: string;
  name: string;
  roleId: string;
  temporaryPassword: string;
  phoneFixed?: string;
  phoneMobile?: string;
  jobTitle?: string;
};

export type ModifyUserInput = {
  id: string;
  email?: string;
  name?: string;
  roleId?: string | null;
  temporaryPassword?: string;
  phoneFixed?: string | null;
  phoneMobile?: string | null;
  jobTitle?: string | null;
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
      // Optimistic update pour un affichage instantané
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patchList = dispatch(
          usersApi.util.updateQueryData("getUsers", undefined, (draft) => {
            const u = draft.find((user) => user.id === arg.id);
            if (!u) return;
            if (arg.email !== undefined) u.email = arg.email;
            if (arg.name !== undefined) u.name = arg.name;
            if (arg.jobTitle !== undefined) u.jobTitle = arg.jobTitle;
            if (arg.phoneFixed !== undefined) u.phoneFixed = arg.phoneFixed;
            if (arg.phoneMobile !== undefined) u.phoneMobile = arg.phoneMobile;
            if (arg.roleId !== undefined) u.roleId = arg.roleId;
          })
        );

        const patchMe = dispatch(
          usersApi.util.updateQueryData("getMe", undefined, (draft) => {
            if (!draft || draft.id !== arg.id) return;
            if (arg.email !== undefined) draft.email = arg.email;
            if (arg.name !== undefined) draft.name = arg.name;
            if (arg.jobTitle !== undefined) draft.jobTitle = arg.jobTitle;
            if (arg.phoneFixed !== undefined) draft.phoneFixed = arg.phoneFixed;
            if (arg.phoneMobile !== undefined)
              draft.phoneMobile = arg.phoneMobile;
            if (arg.roleId !== undefined) draft.roleId = arg.roleId;
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchList.undo();
          patchMe.undo();
        }
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: "Users", id: arg.id },
        { type: "Users", id: "LIST" },
        { type: "Me", id: "CURRENT" },
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
        { type: "Me", id: "CURRENT" },
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
