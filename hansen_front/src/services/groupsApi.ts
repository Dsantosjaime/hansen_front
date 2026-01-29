import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type SubGroup = {
  id: string;
  name: string;
  groupId: string;
};

export type Group = {
  id: string;
  name: string;
  subGroups?: SubGroup[];
};

export type CreateGroupDto = {
  name: string;
};

export type UpdateGroupDto = Partial<CreateGroupDto>;

export const groupsApi = createApi({
  reducerPath: "groupsApi",
  tagTypes: ["Groups"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    // GET /groups
    getGroups: builder.query<Group[], void>({
      query: () => ({
        url: "/groups",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "Groups", id: "LIST" },
              ...result.map((g) => ({ type: "Groups" as const, id: g.id })),
            ]
          : [{ type: "Groups", id: "LIST" }],
    }),

    // GET /groups/:id
    getGroupById: builder.query<Group, string>({
      query: (id) => ({
        url: `/groups/${id}`,
        method: "GET",
      }),
      providesTags: (_res, _err, id) => [{ type: "Groups", id }],
    }),

    // POST /groups
    createGroup: builder.mutation<Group, CreateGroupDto>({
      query: (body) => ({
        url: "/groups",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Groups", id: "LIST" }],
    }),

    // PATCH /groups/:id
    updateGroup: builder.mutation<Group, { id: string; data: UpdateGroupDto }>({
      query: ({ id, data }) => ({
        url: `/groups/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Groups", id: "LIST" },
        { type: "Groups", id: arg.id },
      ],
    }),

    // DELETE /groups/:id
    deleteGroup: builder.mutation<Group, string>({
      query: (id) => ({
        url: `/groups/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, id) => [
        { type: "Groups", id: "LIST" },
        { type: "Groups", id },
      ],
    }),
  }),
});

export const {
  useGetGroupsQuery,
  useGetGroupByIdQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
} = groupsApi;
