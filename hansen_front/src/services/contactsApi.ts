import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { AuthState } from "@/slices/authSlice";

type StateWithAuth = { auth: AuthState };

export type GroupRef = { id: number; name: string };
export type SubGroupRef = { id: number; name: string };

export type Contact = {
  firstName: string;
  lastName: string;
  function: string;
  status: string;
  email: string;
  phoneNumber: [string, string];
  lastContact: string; // ISO
  lastEmail: string; // ISO
  group: GroupRef;
  subGroup: SubGroupRef;
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

  // [PLACEHOLDER] dataset mock : à enrichir si besoin
  const base: Omit<Contact, "group" | "subGroup">[] = [
    {
      firstName: "Sophie",
      lastName: "Martin",
      function: "Responsable RH",
      status: "Actif",
      email: "sophie.martin@example.com",
      phoneNumber: ["+33 6 00 00 00 02", "+33 1 00 00 00 02"],
      lastContact: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
      lastEmail: "Rappel des echeances de départ",
    },
    {
      firstName: "Alex",
      lastName: "Bernard",
      function: "Technicien",
      status: "Inactif",
      email: "alex.bernard@example.com",
      phoneNumber: ["+33 6 00 00 00 03", "+33 1 00 00 00 03"],
      lastContact: new Date(now - 1000 * 60 * 60 * 24 * 30).toISOString(),
      lastEmail: "Demande de Depot de fond",
    },
    {
      firstName: "Jaime",
      lastName: "Dos Santos",
      function: "Chef de projet",
      status: "Actif",
      email: "jaime@example.com",
      phoneNumber: ["+33 6 00 00 00 01", "+33 1 00 00 00 01"],
      lastContact: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
      lastEmail: "Demande de Depot de fond",
    },
  ];

  return base.map((c, idx) => ({
    ...c,
    group,
    subGroup: subGroups[idx % Math.max(1, subGroups.length)] ?? {
      id: -1,
      name: "Sans sous-groupe",
    },
  }));
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
    // IMPORTANT: on tire par groupe uniquement
    getContactsByGroup: builder.query<Contact[], { groupId: number }>({
      async queryFn({ groupId }) {
        const data = makeMockContactsForGroup(groupId);
        return {
          data,
        };
      },
    }),

    // Optionnel mais pratique pour la vue (mock)
    getGroups: builder.query<GroupRef[], void>({
      async queryFn() {
        return { data: mockGroups };
      },
    }),

    // Optionnel : sous-groupes dépendants du groupe (mock)
    getSubGroupsByGroup: builder.query<SubGroupRef[], { groupId: number }>({
      async queryFn({ groupId }) {
        return { data: mockSubGroupsByGroupId[groupId] ?? [] };
      },
    }),
  }),
});

export const {
  useGetContactsByGroupQuery,
  useGetGroupsQuery,
  useGetSubGroupsByGroupQuery,
} = contactsApi;
