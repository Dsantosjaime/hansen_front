import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type ExtractSubGroupInput = {
  id: string;
  name: string;
};

export type ExtractGroupInput = {
  id: string;
  name: string;
  subGroups: ExtractSubGroupInput[];
};

export type ExtractContactLite = {
  lastName: string | null;
  function: string | null;
  email: string | null;
};

export type ExtractSubGroupOutput = {
  id: string;
  name: string;
  contacts: ExtractContactLite[];
};

export type ExtractGroupOutput = {
  id: string;
  name: string;
  subGroups: ExtractSubGroupOutput[];
};

export const extractApi = createApi({
  reducerPath: "extractApi",
  tagTypes: ["Extract"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    // POST /extract/contacts
    extractContacts: builder.mutation<
      ExtractGroupOutput[],
      ExtractGroupInput[]
    >({
      query: (body) => ({
        url: "/extract/contacts",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useExtractContactsMutation } = extractApi;
