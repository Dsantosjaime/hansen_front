import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type EmailSend = {
  id: string;
  contactId: string | null;
  email: string;
  brevoCampaignId: number;
  subject: string;
  status: string;

  sentAt?: string | null;
  deliveredAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  bouncedAt?: string | null;
  unsubscribedAt?: string | null;

  createdAt: string;
  updatedAt: string;
};

export const emailsApi = createApi({
  reducerPath: "emailsApi",
  tagTypes: ["EmailHistory"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    // GET /emails/contacts/:contactId/history
    getContactEmailHistory: builder.query<EmailSend[], { contactId: string }>({
      query: ({ contactId }) => ({
        url: `/emails/contacts/${contactId}/history`,
        method: "GET",
      }),
      providesTags: (_res, _err, arg) => [
        { type: "EmailHistory", id: "LIST" },
        { type: "EmailHistory", id: arg.contactId },
      ],
    }),
  }),
});

export const { useGetContactEmailHistoryQuery } = emailsApi;
