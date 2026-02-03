import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type BrevoTemplate = {
  id: number;
  name: string;
  subject: string;
  // si ton backend renvoie isActive, tu peux l'ajouter:
  // isActive: boolean;
};

export type SendCampaignDto = {
  templateId: number; // ✅ nouveau champ backend
  name?: string;
  groupIds?: string[];
  subGroupIds?: string[];

  // optionnel si tu l’ajoutes côté backend
  // attachmentUrl?: string;
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

export const brevoMarketingApi = createApi({
  reducerPath: "brevoMarketingApi",
  tagTypes: ["BrevoTemplates", "BrevoSync", "EmailHistory"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    // GET /brevo/marketing/templates
    getBrevoMarketingTemplates: builder.query<BrevoTemplate[], void>({
      query: () => ({
        url: "/brevo/marketing/templates",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "BrevoTemplates", id: "LIST" },
              ...result.map((t) => ({
                type: "BrevoTemplates" as const,
                id: t.id,
              })),
            ]
          : [{ type: "BrevoTemplates", id: "LIST" }],
    }),

    // POST /brevo/marketing/send
    sendBrevoMarketingCampaign: builder.mutation<
      SendCampaignResult,
      SendCampaignDto
    >({
      query: (body) => ({
        url: "/brevo/marketing/send",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "EmailHistory", id: "LIST" },
        { type: "BrevoSync", id: "ANY" },
      ],
    }),

    // POST /brevo/marketing/sub-groups/:id/ensure-list
    ensureBrevoListForSubGroup: builder.mutation<
      number,
      { subGroupId: string }
    >({
      query: ({ subGroupId }) => ({
        url: `/brevo/marketing/sub-groups/${subGroupId}/ensure-list`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "BrevoSync", id: "ANY" }],
    }),

    // POST /brevo/marketing/sub-groups/:id/resync
    resyncBrevoSubGroup: builder.mutation<
      BulkSyncResult,
      { subGroupId: string }
    >({
      query: ({ subGroupId }) => ({
        url: `/brevo/marketing/sub-groups/${subGroupId}/resync`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "BrevoSync", id: "ANY" }],
    }),

    // POST /brevo/marketing/resync
    resyncBrevoAllSubGroups: builder.mutation<ResyncAllResult, void>({
      query: () => ({
        url: "/brevo/marketing/resync",
        method: "POST",
      }),
      invalidatesTags: [{ type: "BrevoSync", id: "ANY" }],
    }),

    // POST /brevo/marketing/sub-groups/:id/contacts/bulk-sync
    bulkSyncContactsToBrevoSubGroup: builder.mutation<
      BulkSyncResult,
      { subGroupId: string; data: BulkSyncContactsDto }
    >({
      query: ({ subGroupId, data }) => ({
        url: `/brevo/marketing/sub-groups/${subGroupId}/contacts/bulk-sync`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "BrevoSync", id: "ANY" },
        { type: "EmailHistory", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetBrevoMarketingTemplatesQuery,
  useSendBrevoMarketingCampaignMutation,
  useEnsureBrevoListForSubGroupMutation,
  useResyncBrevoSubGroupMutation,
  useResyncBrevoAllSubGroupsMutation,
  useBulkSyncContactsToBrevoSubGroupMutation,
} = brevoMarketingApi;
