import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type EmailAddressTemplate = {
  id: string;
  name: string;
  pattern: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const emailAddressTemplatesApi = createApi({
  reducerPath: "emailAddressTemplatesApi",
  tagTypes: ["EmailAddressTemplates"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    getEmailAddressTemplates: builder.query<
      EmailAddressTemplate[],
      { activeOnly?: boolean } | void
    >({
      query: (arg) => ({
        url: "/email-address-templates",
        method: "GET",
        params: arg ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "EmailAddressTemplates", id: "LIST" },
              ...result.map((tpl) => ({
                type: "EmailAddressTemplates" as const,
                id: tpl.id,
              })),
            ]
          : [{ type: "EmailAddressTemplates", id: "LIST" }],
    }),
  }),
});

export const { useGetEmailAddressTemplatesQuery } = emailAddressTemplatesApi;
