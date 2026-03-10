import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

/**
 * Types génériques (ne plus mentionner Brevo côté front)
 */
export type EmailTemplate = {
  id: number;
  name: string;
  subject: string;
  isActive?: boolean;
};

export type SendCampaignDto = {
  templateId: number;
  name?: string;
  groupIds?: string[];
  subGroupIds?: string[];
  attachmentUrl?: string;
  scheduledAt?: string;
};

export type SendCampaignResult = {
  campaignId: number;
  listIds: number[];
  scheduledAt: string | null;
  recipientsLogged?: number;
};

export type BulkSyncContactsDto = {
  emails: string[];
};

export type BulkSyncResult = {
  listId: number;
  total: number;
  success: number;
  failed: number;
  chunkSize: number;
};

export type ResyncAllResult = {
  subGroups: number;
  results: BulkSyncResult[];
};

/**
 * Nouveau modèle de campagne stocké en DB (EmailSend)
 */
export type EmailSendSubGroup = {
  subGroupId: string;
  subGroupName: string;
};

export type EmailSendGroup = {
  groupId: string;
  groupName: string;
  subGroups: EmailSendSubGroup[];
};

export type EmailSend = {
  id: string;

  brevoCampaignId: string;
  subject: string;
  status: string;

  affected: EmailSendGroup[];
  affectedGroupIds: string[];
  affectedSubGroupIds: string[];

  recipientsCount?: number | null;
  listIds: number[];
  scheduledAt?: string | null;

  createdAt: string;
  updatedAt: string;

  sentAt?: string | null;
  deliveredAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  bouncedAt?: string | null;
  unsubscribedAt?: string | null;
};

/**
 * Réponse paginée de GET /emails/marketing/campaigns
 * (selon backend: { items, total, limit, offset })
 */
export type PaginatedEmailSends = {
  items: EmailSend[];
  total: number;
  limit: number;
  offset: number;
};

export const emailApi = createApi({
  reducerPath: "emailApi",
  tagTypes: ["EmailTemplates", "EmailCampaigns", "EmailSync", "EmailHistory"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    /**
     * GET /emails/marketing/templates
     */
    getEmailMarketingTemplates: builder.query<EmailTemplate[], void>({
      query: () => ({
        url: "/emails/marketing/templates",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "EmailTemplates", id: "LIST" },
              ...result.map((t) => ({
                type: "EmailTemplates" as const,
                id: t.id,
              })),
            ]
          : [{ type: "EmailTemplates", id: "LIST" }],
    }),

    /**
     * GET /emails/marketing/campaigns
     * BACKEND => PaginatedEmailSends
     */
    getEmailMarketingCampaigns: builder.query<
      PaginatedEmailSends,
      { limit?: number; offset?: number } | void
    >({
      query: (arg) => ({
        url: "/emails/marketing/campaigns",
        method: "GET",
        params: arg ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "EmailCampaigns", id: "LIST" },
              ...result.items.map((c) => ({
                type: "EmailCampaigns" as const,
                id: c.id,
              })),
            ]
          : [{ type: "EmailCampaigns", id: "LIST" }],
    }),

    /**
     * GET /emails/marketing/campaigns/:id
     * (nouvelle route getEmailInfo)
     */
    getEmailInfo: builder.query<EmailSend, { id: string }>({
      query: ({ id }) => ({
        url: `/emails/marketing/campaigns/${id}`,
        method: "GET",
      }),
      providesTags: (_res, _err, arg) => [
        { type: "EmailCampaigns", id: arg.id },
      ],
    }),

    /**
     * POST /emails/marketing/campaigns/send
     */
    sendEmailMarketingCampaign: builder.mutation<
      SendCampaignResult,
      SendCampaignDto
    >({
      query: (body) => ({
        url: "/emails/marketing/campaigns/send",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "EmailHistory", id: "LIST" },
        { type: "EmailSync", id: "ANY" },
        { type: "EmailCampaigns", id: "LIST" },
      ],
    }),

    /**
     * POST /emails/marketing/sub-groups/:id/ensure-list
     */
    ensureMarketingListForSubGroup: builder.mutation<
      number,
      { subGroupId: string }
    >({
      query: ({ subGroupId }) => ({
        url: `/emails/marketing/sub-groups/${subGroupId}/ensure-list`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "EmailSync", id: "ANY" }],
    }),

    /**
     * POST /emails/marketing/sub-groups/:id/resync
     */
    resyncMarketingSubGroup: builder.mutation<
      BulkSyncResult,
      { subGroupId: string }
    >({
      query: ({ subGroupId }) => ({
        url: `/emails/marketing/sub-groups/${subGroupId}/resync`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "EmailSync", id: "ANY" }],
    }),

    /**
     * POST /emails/marketing/resync
     */
    resyncMarketingAllSubGroups: builder.mutation<ResyncAllResult, void>({
      query: () => ({
        url: "/emails/marketing/resync",
        method: "POST",
      }),
      invalidatesTags: [{ type: "EmailSync", id: "ANY" }],
    }),

    /**
     * POST /emails/marketing/sub-groups/:id/contacts/bulk-sync
     */
    bulkSyncContactsToSubGroupList: builder.mutation<
      BulkSyncResult,
      { subGroupId: string; data: BulkSyncContactsDto }
    >({
      query: ({ subGroupId, data }) => ({
        url: `/emails/marketing/sub-groups/${subGroupId}/contacts/bulk-sync`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "EmailSync", id: "ANY" },
        { type: "EmailHistory", id: "LIST" },
      ],
    }),

    /**
     * GET /emails/contacts/:contactId
     * Maintenant: renvoie une liste de EmailSend (campagnes) pertinentes pour le contact
     */
    getContactEmails: builder.query<EmailSend[], { contactId: string }>({
      query: ({ contactId }) => ({
        url: `/emails/contacts/${contactId}`,
        method: "GET",
      }),
      providesTags: (_res, _err, arg) => [
        { type: "EmailHistory", id: "ANY" },
        { type: "EmailHistory", id: arg.contactId },
      ],
    }),
  }),
});

export const {
  useGetEmailMarketingTemplatesQuery,
  useGetEmailMarketingCampaignsQuery,
  useGetEmailInfoQuery,
  useSendEmailMarketingCampaignMutation,
  useEnsureMarketingListForSubGroupMutation,
  useResyncMarketingSubGroupMutation,
  useResyncMarketingAllSubGroupsMutation,
  useBulkSyncContactsToSubGroupListMutation,
  useGetContactEmailsQuery,
} = emailApi;
