import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";
import { SelectOption } from "@/components/ui/select.types";

export enum Status {
  NO_EXCHANGE = "NO_EXCHANGE",
  MET = "MET",
  CLIENT = "CLIENT",
  UNDESIRABLE = "UNDESIRABLE",
  TO_VERIFY = "TO_VERIFY",
}

export const CONTACT_STATUS_LABEL: Record<Status, string> = {
  [Status.NO_EXCHANGE]: "Pas d'échange",
  [Status.MET]: "Rencontré",
  [Status.CLIENT]: "Client",
  [Status.UNDESIRABLE]: "Indésirable",
  [Status.TO_VERIFY]: "A vérifier",
};

export const contactStatusOptions: SelectOption<Status>[] = Object.values(
  Status
).map((value) => ({
  value,
  label: CONTACT_STATUS_LABEL[value],
}));

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
  createdAt?: string;
  updatedAt?: string;
};

export type CreateContactDto = {
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

export type UpdateContactDto = Partial<CreateContactDto>;

export type BulkDeleteContactsDto = {
  ids: string[];
};

export type BulkDeleteContactsResult = {
  requestedCount: number;
  foundCount: number;
  deletedCount: number;
  notFoundIds: string[];
};

/**
 * Enlève tout champ "non DTO" si jamais il est présent par erreur.
 * (utile si tu passes un objet Contact complet au lieu d'un DTO)
 */
function sanitizeContactPayload<T extends Record<string, any>>(data: T) {
  const { id, createdAt, updatedAt, ...rest } = data;
  return rest;
}

export const contactsApi = createApi({
  reducerPath: "contactsApi",
  tagTypes: ["Contacts", "EmailHistory"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
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

    getContactById: builder.query<Contact, { id: string }>({
      query: ({ id }) => ({
        url: `/contacts/${id}`,
        method: "GET",
      }),
      providesTags: (_res, _err, arg) => [{ type: "Contacts", id: arg.id }],
    }),

    createContact: builder.mutation<Contact, CreateContactDto>({
      query: (body) => ({
        url: "/contacts",
        method: "POST",
        body: sanitizeContactPayload(body),
      }),
      invalidatesTags: [{ type: "Contacts", id: "LIST" }],
    }),

    updateContact: builder.mutation<
      Contact,
      { id: string; data: UpdateContactDto }
    >({
      query: ({ id, data }) => ({
        url: `/contacts/${id}`,
        method: "PATCH",
        body: sanitizeContactPayload(data),
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Contacts", id: "LIST" },
        { type: "Contacts", id: arg.id },
      ],
    }),

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

    bulkDeleteContacts: builder.mutation<
      BulkDeleteContactsResult,
      BulkDeleteContactsDto
    >({
      query: (body) => ({
        url: "/contacts/bulk-delete",
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Contacts", id: "LIST" },
        ...(arg.ids ?? []).map((id) => ({ type: "Contacts" as const, id })),
      ],
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
  useBulkDeleteContactsMutation,
} = contactsApi;
