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

/**
 * ✅ NEW: DTO pour "marqué comme déjà envoyé" (sans envoi)
 * On supporte groupIds/subGroupIds côté API, mais dans l'écran NewEmail
 * on enverra uniquement subGroupIds pour éviter d'inclure tout un groupe.
 */
export type MarkCampaignAsSentDto = {
  templateId: number;
  groupIds?: string[];
  subGroupIds?: string[];
};

/**
 * ✅ NEW: résultat côté backend (proposition alignée avec ce qu'on a implémenté serveur)
 */
export type MarkCampaignAsSentResult = {
  ok: true;
  emailSendId: string;
  templateId: number;
  subject: string;
  lastSentAt: string; // Date ISO côté JSON
  updatedCount: number;
  recipientsCount: number;
  subGroupIds: string[];
  notFoundSubGroupIds: string[];
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

export type EmailSendSource = "BREVO" | "MANUAL";

export type EmailSend = {
  id: string;

  // ✅ devient optionnel (MANUAL n'a pas forcément de brevoCampaignId)
  brevoCampaignId?: string | null;

  templateId: number;
  name?: string | null;
  subject: string;
  status: string;

  // ✅ NEW
  source?: EmailSendSource;
  note?: string | null;

  affected: EmailSendGroup[];
  affectedGroupIds: string[];
  affectedSubGroupIds: string[];

  recipientsCount?: number | null;

  listIds: number[];
  tempListId?: number | null;

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
     * ✅ NEW: POST /emails/marketing/campaigns/mark-sent
     */
    markEmailMarketingCampaignAsSent: builder.mutation<
      MarkCampaignAsSentResult,
      MarkCampaignAsSentDto
    >({
      query: (body) => ({
        url: "/emails/marketing/campaigns/mark-sent",
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
  useMarkEmailMarketingCampaignAsSentMutation,
  useEnsureMarketingListForSubGroupMutation,
  useResyncMarketingSubGroupMutation,
  useResyncMarketingAllSubGroupsMutation,
  useBulkSyncContactsToSubGroupListMutation,
  useGetContactEmailsQuery,
} = emailApi;
