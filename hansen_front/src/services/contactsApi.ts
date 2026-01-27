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

const mockGroups: Group[] = [
  {
    id: "1",
    name: "Groupe A",
    subGroup: [
      { id: "1", name: "Sous-Groupe A1" },
      { id: "2", name: "Sous-Groupe A2" },
    ],
  },
  {
    id: "2",
    name: "Groupe B",
    subGroup: [{ id: "1", name: "Sous-Groupe B1" }],
  },
];

function makeMockContactsForGroup(groupId: string): Contact[] {
  const base: Contact[] = [
    {
      id: "0",
      groupId: "1",
      subGroupId: "1",
      firstName: "Sophie",
      lastName: "Martin",
      function: "Responsable RH",
      status: Status.ACTIF,
      email: "sophie.martin@example.com",
      phoneNumber: ["+33 6 00 00 00 02", "+33 1 00 00 00 02"],
      lastContact: new Date().toISOString(),
      lastEmail: "Rappel des echeances de départ",
    },
    {
      id: "1",
      groupId: "1",
      subGroupId: "1",
      firstName: "Alex",
      lastName: "Bernard",
      function: "Technicien",
      status: Status.INACTIF,
      email: "alex.bernard@example.com",
      phoneNumber: ["+33 6 00 00 00 03", "+33 1 00 00 00 03"],
      lastContact: new Date().toISOString(),
      lastEmail: "Demande de Depot de fond",
    },
    {
      id: "2",
      groupId: "1",
      subGroupId: "2",
      firstName: "Jaime",
      lastName: "Dos Santos",
      function: "Chef de projet",
      status: Status.INACTIF,
      email: "jaime@example.com",
      phoneNumber: ["+33 6 00 00 00 01", "+33 1 00 00 00 01"],
      lastContact: new Date().toISOString(),
      lastEmail: "Demande de Depot de fond",
    },
  ];
  return base.filter((contact) => contact.groupId === groupId);
}

// petit hash déterministe pour générer des emails stables
function hashStringToInt(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function makeMockContactEmails(contactId: string): ContactEmail[] {
  const seed = hashStringToInt(contactId);
  const subjects = [
    "Demande de dépôt de fond",
    "Relance - documents manquants",
    "Rappel de rendez-vous",
    "Informations complémentaires",
    "Confirmation de réception",
    "Suivi de dossier",
  ];

  const count = 8 + (seed % 8); // 8..15 emails
  const now = Date.now();

  return Array.from({ length: count }).map((_, i) => {
    const offsetDays = i * (2 + ((seed + i) % 4));
    const sentAt = new Date(
      now - offsetDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const subject = subjects[(seed + i) % subjects.length];

    return {
      id: `${contactId}-mail-${i}`,
      sentAt,
      subject,
    };
  });
}

export const contactsApi = createApi({
  reducerPath: "contactsApi",
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    getContactsByGroup: builder.query<Contact[], { groupId: string }>({
      async queryFn({ groupId }) {
        const data = makeMockContactsForGroup(groupId);
        return { data };
      },
    }),

    getGroups: builder.query<Group[], void>({
      async queryFn() {
        const sleep = (ms: number) =>
          new Promise<void>((resolve) => setTimeout(resolve, ms));

        await sleep(2000);

        return { data: mockGroups };
      },
    }),

    // ✅ supprimé: getSubGroupsByGroup

    getContactEmails: builder.query<ContactEmail[], { contactId: string }>({
      async queryFn({ contactId }) {
        const data = makeMockContactEmails(contactId);
        return { data };
      },
    }),
  }),
});

export const {
  useGetContactsByGroupQuery,
  useGetGroupsQuery,
  useGetContactEmailsQuery,
} = contactsApi;
