import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export enum Status {
  ACTIF = "Actif",
  INACTIF = "Inactif",
}

/**
 * IMPORTANT:
 * - Backend Prisma: functions (string), phoneNumber (string)
 * - Ici je garde ton type mais pour les appels API j’utilise functions/phoneNumber string.
 */
export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  function: string;

  status: Status;

  email: string;
  phoneNumber: string[];
  lastContact: string;
  lastEmail: string;
  groupId: string;
  subGroupId: string;
};

export type ContactEmail = {
  id: string;
  sentAt: string; // ISO
  subject: string;
};

export type CreateContactDto = {
  firstName: string;
  lastName: string;
  function: string;
  status: string; // "Actif" | "Inactif" (ou autres valeurs si tu en as)
  email: string;
  phoneNumber: string[];
  lastContact: string;
  lastEmail: string;
  groupId: string;
  subGroupId: string;
};

export type UpdateContactDto = Partial<CreateContactDto>;

export const contactsApi = createApi({
  reducerPath: "contactsApi",
  tagTypes: ["Contacts"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    /**
     * GET /contacts?groupId=&subGroupId=&status=
     */
    getContacts: builder.query<
      Contact[],
      { groupId?: string; subGroupId?: string; status?: string } | void
    >({
      query: (arg) => ({
        url: "/contacts",
        method: "GET",
        params: arg ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "Contacts", id: "LIST" },
              ...result.map((c) => ({ type: "Contacts" as const, id: c.id })),
            ]
          : [{ type: "Contacts", id: "LIST" }],
    }),

    /**
     * Compat: ton ancien endpoint "getContactsByGroup"
     * => appelle GET /contacts?groupId=...
     */
    getContactsByGroup: builder.query<Contact[], { groupId: string }>({
      query: ({ groupId }) => ({
        url: "/contacts",
        method: "GET",
        params: { groupId },
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "Contacts", id: "LIST" },
              ...result.map((c) => ({ type: "Contacts" as const, id: c.id })),
            ]
          : [{ type: "Contacts", id: "LIST" }],
    }),

    /**
     * GET /contacts/:id
     */
    getContactById: builder.query<Contact, { id: string }>({
      query: ({ id }) => ({
        url: `/contacts/${id}`,
        method: "GET",
      }),
      providesTags: (_res, _err, arg) => [{ type: "Contacts", id: arg.id }],
    }),

    /**
     * POST /contacts
     */
    createContact: builder.mutation<Contact, CreateContactDto>({
      query: (body) => ({
        url: "/contacts",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Contacts", id: "LIST" }],
    }),

    /**
     * PATCH /contacts/:id
     */
    updateContact: builder.mutation<
      Contact,
      { id: string; data: UpdateContactDto }
    >({
      query: ({ id, data }) => ({
        url: `/contacts/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Contacts", id: "LIST" },
        { type: "Contacts", id: arg.id },
      ],
    }),

    /**
     * DELETE /contacts/:id
     */
    deleteContact: builder.mutation<Contact, { id: string }>({
      query: ({ id }) => ({
        url: `/contacts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Contacts", id: "LIST" },
        { type: "Contacts", id: arg.id },
      ],
    }),

    /**
     * Pas encore implémenté côté backend (à créer si tu veux)
     * Exemple de route à créer: GET /contacts/:id/emails
     */
    getContactEmails: builder.query<ContactEmail[], { contactId: string }>({
      query: ({ contactId }) => ({
        url: `/contacts/${contactId}/emails`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetContactsQuery,
  useGetContactsByGroupQuery,
  useGetContactByIdQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useGetContactEmailsQuery,
} = contactsApi;
