import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type GroupLite = {
  id: string;
  name: string;
};

export type SubGroup = {
  id: string;
  name: string;
  groupId: string;
  group?: GroupLite; // selon include côté backend
};

export type CreateSubGroupDto = {
  name: string;
  groupId: string;
};

export type UpdateSubGroupDto = Partial<CreateSubGroupDto>;

export const subGroupsApi = createApi({
  reducerPath: "subGroupsApi",
  tagTypes: ["SubGroups"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    // GET /sub-groups?groupId=...
    getSubGroups: builder.query<SubGroup[], { groupId?: string } | void>({
      query: (arg) => ({
        url: "/subgroups",
        method: "GET",
        params: arg?.groupId ? { groupId: arg.groupId } : undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "SubGroups", id: "LIST" },
              ...result.map((s) => ({ type: "SubGroups" as const, id: s.id })),
            ]
          : [{ type: "SubGroups", id: "LIST" }],
    }),

    // GET /sub-groups/:id
    getSubGroupById: builder.query<SubGroup, string>({
      query: (id) => ({
        url: `/subgroups/${id}`,
        method: "GET",
      }),
      providesTags: (_res, _err, id) => [{ type: "SubGroups", id }],
    }),

    // POST /sub-groups
    createSubGroup: builder.mutation<SubGroup, CreateSubGroupDto>({
      query: (body) => ({
        url: "/subgroups",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "SubGroups", id: "LIST" }],
    }),

    // PATCH /sub-groups/:id
    updateSubGroup: builder.mutation<
      SubGroup,
      { id: string; data: UpdateSubGroupDto }
    >({
      query: ({ id, data }) => ({
        url: `/subgroups/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "SubGroups", id: "LIST" },
        { type: "SubGroups", id: arg.id },
      ],
    }),

    // DELETE /sub-groups/:id
    deleteSubGroup: builder.mutation<SubGroup, string>({
      query: (id) => ({
        url: `/subgroups/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, id) => [
        { type: "SubGroups", id: "LIST" },
        { type: "SubGroups", id },
      ],
    }),
  }),
});

export const {
  useGetSubGroupsQuery,
  useGetSubGroupByIdQuery,
  useCreateSubGroupMutation,
  useUpdateSubGroupMutation,
  useDeleteSubGroupMutation,
} = subGroupsApi;
