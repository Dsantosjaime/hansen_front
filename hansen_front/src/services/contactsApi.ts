import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type Group = { id: string; name: string; subGroup: SubGroup[] };
export type SubGroup = { id: string; name: string };

export enum Status {
  ACTIF = "Actif",
  INACTIF = "Inactif",
}

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  function: string;
  status: Status;
  email: string;
  phoneNumber: [string, string];
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

export const contactsApi = createApi({
  reducerPath: "contactsApi",
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    getContactsByGroup: builder.query<Contact[], { groupId: string }>({
      async queryFn({ groupId }) {
        return { data: [] };
      },
    }),

    getContactEmails: builder.query<ContactEmail[], { contactId: string }>({
      async queryFn({ contactId }) {
        return { data: [] };
      },
    }),
  }),
});

export const { useGetContactsByGroupQuery, useGetContactEmailsQuery } =
  contactsApi;
