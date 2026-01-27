import { UserRulesGroup } from "@/types/userRulesGroup";
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type StateWithAuth = {
  auth: {
    token?: string | null;
  };
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const userRulesGroupsApi = createApi({
  reducerPath: "userRulesGroupsApi",
  tagTypes: ["UserRulesGroups"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    getUserRulesGroups: builder.query<UserRulesGroup[], void>({
      async queryFn() {
        await sleep(2000);

        const data: UserRulesGroup[] = [
          {
            id: "test",
            name: "Super-Admin",
            domains: [
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
            ],
          },
          {
            id: "test1",
            name: "Utilisateur",
            domains: [
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
                    ],
                  },
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
              { type: "UserRulesGroups", id: "LIST" },
              ...result.map((d) => ({
                type: "UserRulesGroups" as const,
                id: d.id,
              })),
            ]
          : [{ type: "UserRulesGroups", id: "LIST" }],
    }),
  }),
});

export const { useGetUserRulesGroupsQuery } = userRulesGroupsApi;
