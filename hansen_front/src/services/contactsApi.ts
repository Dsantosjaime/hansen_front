import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { AuthState } from "@/slices/authSlice";

type StateWithAuth = { auth: AuthState };

export type GroupRef = { id: number; name: string };
export type SubGroupRef = { id: number; name: string };

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
  group: GroupRef;
  subGroup: SubGroupRef;
};

export type ContactEmail = {
  id: string;
  sentAt: string; // ISO
  subject: string;
};

const mockGroups: GroupRef[] = [
  { id: 1, name: "Groupe A" },
  { id: 2, name: "Groupe B" },
];

const mockSubGroupsByGroupId: Record<number, SubGroupRef[]> = {
  1: [
    { id: 10, name: "Sous-Groupe A1" },
    { id: 11, name: "Sous-Groupe A2" },
  ],
  2: [
    { id: 20, name: "Sous-Groupe B1" },
    { id: 21, name: "Sous-Groupe B2" },
  ],
};

function makeMockContactsForGroup(groupId: number): Contact[] {
  const group = mockGroups.find((g) => g.id === groupId) ?? mockGroups[0];
  const subGroups = mockSubGroupsByGroupId[group.id] ?? [];
  const now = Date.now();

  const base: Omit<Contact, "group" | "subGroup" | "id">[] = [
    {
      firstName: "Sophie",
      lastName: "Martin",
      function: "Responsable RH",
      status: Status.ACTIF,
      email: "sophie.martin@example.com",
      phoneNumber: ["+33 6 00 00 00 02", "+33 1 00 00 00 02"],
      lastContact: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
      lastEmail: "Rappel des echeances de départ",
    },
    {
      firstName: "Alex",
      lastName: "Bernard",
      function: "Technicien",
      status: Status.INACTIF,
      email: "alex.bernard@example.com",
      phoneNumber: ["+33 6 00 00 00 03", "+33 1 00 00 00 03"],
      lastContact: new Date(now - 1000 * 60 * 60 * 24 * 30).toISOString(),
      lastEmail: "Demande de Depot de fond",
    },
    {
      firstName: "Jaime",
      lastName: "Dos Santos",
      function: "Chef de projet",
      status: Status.INACTIF,
      email: "jaime@example.com",
      phoneNumber: ["+33 6 00 00 00 01", "+33 1 00 00 00 01"],
      lastContact: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
      lastEmail: "Demande de Depot de fond",
    },
  ];

  return base.map((c, idx) => ({
    id: `${group.id}-${idx}`, // ✅ id stable par groupe
    ...c,
    group,
    subGroup: subGroups[idx % Math.max(1, subGroups.length)] ?? {
      id: -1,
      name: "Sans sous-groupe",
    },
  }));
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
    const offsetDays = i * (2 + ((seed + i) % 4)); // espacement variable
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
  baseQuery: fetchBaseQuery({
    baseUrl: "https://api.example.com",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as StateWithAuth).auth.token;
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getContactsByGroup: builder.query<Contact[], { groupId: number }>({
      async queryFn({ groupId }) {
        const data = makeMockContactsForGroup(groupId);
        return {
          data: [
            ...data,
            ...data,
            ...data,
            ...data,
            ...data,
            ...data,
            ...data,
            ...data,
            ...data,
            ...data,
            ...data,
            ...data,
          ],
        };
      },
    }),

    getGroups: builder.query<GroupRef[], void>({
      async queryFn() {
        return { data: mockGroups };
      },
    }),

    getSubGroupsByGroup: builder.query<SubGroupRef[], { groupId: number }>({
      async queryFn({ groupId }) {
        return { data: mockSubGroupsByGroupId[groupId] ?? [] };
      },
    }),

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
  useGetSubGroupsByGroupQuery,
  useGetContactEmailsQuery, // ✅ export hook
} = contactsApi;
