import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export const PluginParamType = {
  FUNCTION: "FUNCTION",
  NAME: "NAME",
} as const;

export type PluginParamTypeValue =
  (typeof PluginParamType)[keyof typeof PluginParamType];

export type PluginParam = {
  id: string;
  name: string;
  type: PluginParamTypeValue;
};

export type CreatePluginParamDto = {
  name: string;
  type: PluginParamTypeValue;
};

export type UpdatePluginParamDto = {
  name?: string;
  type?: PluginParamTypeValue;
};

export const pluginParamsApi = createApi({
  reducerPath: "pluginParamsApi",
  baseQuery: baseQueryWithKeycloakRefresh,
  tagTypes: ["PluginParams"],
  endpoints: (builder) => ({
    // GET /plugin-params
    getPluginParams: builder.query<PluginParam[], void>({
      query: () => ({
        url: "/plugin-params",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "PluginParams" as const, id: "LIST" },
              ...result.map((x) => ({
                type: "PluginParams" as const,
                id: x.id,
              })),
            ]
          : [{ type: "PluginParams" as const, id: "LIST" }],
    }),

    // POST /plugin-params
    createPluginParam: builder.mutation<PluginParam, CreatePluginParamDto>({
      query: (body) => ({
        url: "/plugin-params",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "PluginParams", id: "LIST" }],
    }),

    // PATCH /plugin-params/:id
    updatePluginParam: builder.mutation<
      PluginParam,
      { id: string; data: UpdatePluginParamDto }
    >({
      query: ({ id, data }) => ({
        url: `/plugin-params/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "PluginParams", id: "LIST" },
        { type: "PluginParams", id: arg.id },
      ],
    }),

    // DELETE /plugin-params/:id
    deletePluginParam: builder.mutation<PluginParam, { id: string }>({
      query: ({ id }) => ({
        url: `/plugin-params/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "PluginParams", id: "LIST" },
        { type: "PluginParams", id: arg.id },
      ],
    }),
  }),
});

export const {
  useGetPluginParamsQuery,
  useCreatePluginParamMutation,
  useUpdatePluginParamMutation,
  useDeletePluginParamMutation,
} = pluginParamsApi;
