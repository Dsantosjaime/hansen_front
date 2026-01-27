import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Adapte ce type à ton RootState réel (souvent exporté par ton store).
 * L’important ici: `state.auth.token`.
 */
export type StateWithAuth = {
  auth: {
    token?: string | null;
  };
};

export type Permission = {
  id: string;
  name: string;
};

export type PermissionSubDomain = {
  id: string;
  name: string;
  permissions: Permission[];
};

export type PermissionDomain = {
  id: string;
  name: string;
  subDomain: PermissionSubDomain[];
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const permissionDomainsApi = createApi({
  reducerPath: "permissionDomainsApi",
  tagTypes: ["PermissionDomains"],
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as StateWithAuth).auth.token;
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    /**
     * MOCK + délai (2s)
     * Tu rempliras toi-même les `name`.
     */
    getPermissionsDomains: builder.query<PermissionDomain[], void>({
      async queryFn() {
        await sleep(2000);

        const data: PermissionDomain[] = [
          {
            id: "domain-1",
            name: "Administration",
            subDomain: [
              {
                id: "subdomain-1",
                name: "Utilisateurs",
                permissions: [
                  { id: "perm-1", name: "Créér" },
                  { id: "perm-2", name: "Lire" },
                  { id: "perm-3", name: "Modifier" },
                  { id: "perm-4", name: "Supprimer" },
                ],
              },
              {
                id: "subdomain-2",
                name: "Roles",
                permissions: [
                  { id: "perm-1", name: "Créér" },
                  { id: "perm-2", name: "Lire" },
                  { id: "perm-3", name: "Modifier" },
                  { id: "perm-4", name: "Supprimer" },
                ],
              },
            ],
          },
          {
            id: "domain-2",
            name: "Suivi",
            subDomain: [
              {
                id: "subdomain-3",
                name: "Contacts",
                permissions: [
                  { id: "perm-1", name: "Créér" },
                  { id: "perm-2", name: "Lire" },
                  { id: "perm-3", name: "Modifier" },
                  { id: "perm-4", name: "Supprimer" },
                  { id: "perm-5", name: "Copier" },
                ],
              },
            ],
          },
        ];

        return { data };
      },
      providesTags: (result) =>
        result
          ? [
              { type: "PermissionDomains", id: "LIST" },
              ...result.map((d) => ({
                type: "PermissionDomains" as const,
                id: d.id,
              })),
            ]
          : [{ type: "PermissionDomains", id: "LIST" }],
    }),
  }),
});

export const { useGetPermissionsDomainsQuery } = permissionDomainsApi;
