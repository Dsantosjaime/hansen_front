import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type StateWithAuth = {
  auth: {
    token?: string | null;
  };
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: {
    id: string;
    name: string;
  };
};

export type CreateUserInput = {
  email: string;
  name: string;
  roleId: string;
};

export type ModifyUserInput = {
  id: string;
  email?: string;
  name?: string;
  roleId?: string;
};

let mockUsers: User[] = [
  {
    id: "u-1",
    email: "admin@example.com",
    name: "Admin",
    role: { id: "test", name: "Super-Admin" },
  },
  {
    id: "u-2",
    email: "user@example.com",
    name: "User",
    role: { id: "test1", name: "Utilisateur" },
  },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const uid = () => `u-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const usersApi = createApi({
  reducerPath: "usersApi",
  tagTypes: ["Users"],
  baseQuery: fetchBaseQuery({
    baseUrl: "https://api.example.com",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as StateWithAuth).auth.token;
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      async queryFn() {
        await sleep(400);
        return { data: mockUsers };
      },
      providesTags: (result) =>
        result
          ? [
              { type: "Users", id: "LIST" },
              ...result.map((u) => ({ type: "Users" as const, id: u.id })),
            ]
          : [{ type: "Users", id: "LIST" }],
    }),
    createUser: builder.mutation<User, CreateUserInput>({
      async queryFn(body) {
        await sleep(400);

        const created: User = {
          id: uid(),
          email: body.email,
          name: body.name,
          role: { id: body.roleId, name: "En attendant" },
        };

        mockUsers = [created, ...mockUsers];
        return { data: created };
      },
      invalidatesTags: [{ type: "Users", id: "LIST" }],
    }),
    modifyUser: builder.mutation<User, ModifyUserInput>({
      async queryFn({ id, ...patch }) {
        await sleep(400);

        const idx = mockUsers.findIndex((u) => u.id === id);
        if (idx === -1) {
          return { error: { status: 404, data: "User not found" } as any };
        }

        const prev = mockUsers[idx];
        const next: User = {
          ...prev,
          email: patch.email ?? prev.email,
          name: patch.name ?? prev.name,
          role:
            patch.roleId != null
              ? { id: patch.roleId, name: prev.role.name }
              : prev.role,
        };

        mockUsers = mockUsers.map((u) => (u.id === id ? next : u));
        return { data: next };
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: "Users", id: arg.id },
        { type: "Users", id: "LIST" },
      ],
    }),
    deleteUser: builder.mutation<{ success: true; id: string }, { id: string }>(
      {
        async queryFn({ id }) {
          await sleep(400);

          const exists = mockUsers.some((u) => u.id === id);
          if (!exists) {
            return { error: { status: 404, data: "User not found" } as any };
          }

          mockUsers = mockUsers.filter((u) => u.id !== id);
          return { data: { success: true, id } };
        },
        invalidatesTags: (_res, _err, arg) => [
          { type: "Users", id: arg.id },
          { type: "Users", id: "LIST" },
        ],
      }
    ),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useModifyUserMutation,
  useDeleteUserMutation,
} = usersApi;
