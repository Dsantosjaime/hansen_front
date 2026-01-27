import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export type StateWithAuth = {
  auth: {
    token?: string | null;
  };
};

// --------------------
// Types
// --------------------
export type OmitedFunction = {
  id: string;
  function: string;
};

export type GetOmitedFunctionsResponse = {
  omitedFunctions: OmitedFunction[];
};

export type NameDiscriminator = {
  id: string;
  name: string;
};

export type GetNameDiscriminatorsResponse = {
  nameDiscriminators: NameDiscriminator[];
};

// --------------------
// Mock storage (in-memory)
// --------------------
let mockOmitedFunctions: OmitedFunction[] = [
  { id: "of-1", function: "it dev" },
  { id: "of-2", function: "responsable achat" },
];

let mockNameDiscriminators: NameDiscriminator[] = [
  { id: "nd-1", name: "utilisateur linkedin" },
  { id: "nd-2", name: "test deux" },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// --------------------
// API
// --------------------
export const pluginParamsApi = createApi({
  reducerPath: "pluginParamsApi",
  tagTypes: ["OmitedFunctions", "NameDiscriminators"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    // --------------------
    // Omited Functions
    // --------------------
    getOmitedFunctions: builder.query<GetOmitedFunctionsResponse, void>({
      async queryFn() {
        await sleep(400);
        return { data: { omitedFunctions: mockOmitedFunctions } };
      },
      providesTags: (result) =>
        result
          ? [
              { type: "OmitedFunctions", id: "LIST" },
              ...result.omitedFunctions.map((x) => ({
                type: "OmitedFunctions" as const,
                id: x.id,
              })),
            ]
          : [{ type: "OmitedFunctions", id: "LIST" }],
    }),

    addOmitedFunction: builder.mutation<OmitedFunction, { function: string }>({
      async queryFn({ function: fn }) {
        await sleep(400);
        const created: OmitedFunction = { id: uid("of"), function: fn };
        mockOmitedFunctions = [created, ...mockOmitedFunctions];
        return { data: created };
      },
      invalidatesTags: [{ type: "OmitedFunctions", id: "LIST" }],
    }),

    modifyOmitedFunction: builder.mutation<
      OmitedFunction,
      { id: string; function: string }
    >({
      async queryFn({ id, function: fn }) {
        await sleep(400);
        const idx = mockOmitedFunctions.findIndex((x) => x.id === id);
        if (idx === -1) {
          return {
            error: { status: 404, data: "OmitedFunction not found" } as any,
          };
        }
        const updated: OmitedFunction = {
          ...mockOmitedFunctions[idx],
          function: fn,
        };
        mockOmitedFunctions = mockOmitedFunctions.map((x) =>
          x.id === id ? updated : x
        );
        return { data: updated };
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: "OmitedFunctions", id: arg.id },
        { type: "OmitedFunctions", id: "LIST" },
      ],
    }),

    deleteOmitedFunction: builder.mutation<OmitedFunction, { id: string }>({
      async queryFn({ id }) {
        await sleep(400);
        const existing = mockOmitedFunctions.find((x) => x.id === id);
        if (!existing) {
          return {
            error: { status: 404, data: "OmitedFunction not found" } as any,
          };
        }
        mockOmitedFunctions = mockOmitedFunctions.filter((x) => x.id !== id);
        return { data: existing };
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: "OmitedFunctions", id: arg.id },
        { type: "OmitedFunctions", id: "LIST" },
      ],
    }),

    // --------------------
    // Name Discriminators
    // --------------------
    getNameDiscriminator: builder.query<GetNameDiscriminatorsResponse, void>({
      async queryFn() {
        await sleep(400);
        return { data: { nameDiscriminators: mockNameDiscriminators } };
      },
      providesTags: (result) =>
        result
          ? [
              { type: "NameDiscriminators", id: "LIST" },
              ...result.nameDiscriminators.map((x) => ({
                type: "NameDiscriminators" as const,
                id: x.id,
              })),
            ]
          : [{ type: "NameDiscriminators", id: "LIST" }],
    }),

    addNameDiscriminator: builder.mutation<NameDiscriminator, { name: string }>(
      {
        async queryFn({ name }) {
          await sleep(400);
          const created: NameDiscriminator = { id: uid("nd"), name };
          mockNameDiscriminators = [created, ...mockNameDiscriminators];
          return { data: created };
        },
        invalidatesTags: [{ type: "NameDiscriminators", id: "LIST" }],
      }
    ),

    modifyNameDiscriminator: builder.mutation<
      NameDiscriminator,
      { id: string; name: string }
    >({
      async queryFn({ id, name }) {
        await sleep(400);
        const idx = mockNameDiscriminators.findIndex((x) => x.id === id);
        if (idx === -1) {
          return {
            error: { status: 404, data: "NameDiscriminator not found" } as any,
          };
        }
        const updated: NameDiscriminator = {
          ...mockNameDiscriminators[idx],
          name,
        };
        mockNameDiscriminators = mockNameDiscriminators.map((x) =>
          x.id === id ? updated : x
        );
        return { data: updated };
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: "NameDiscriminators", id: arg.id },
        { type: "NameDiscriminators", id: "LIST" },
      ],
    }),

    deleteNameDiscriminator: builder.mutation<
      NameDiscriminator,
      { id: string }
    >({
      async queryFn({ id }) {
        await sleep(400);
        const existing = mockNameDiscriminators.find((x) => x.id === id);
        if (!existing) {
          return {
            error: { status: 404, data: "NameDiscriminator not found" } as any,
          };
        }
        mockNameDiscriminators = mockNameDiscriminators.filter(
          (x) => x.id !== id
        );
        return { data: existing };
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: "NameDiscriminators", id: arg.id },
        { type: "NameDiscriminators", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetOmitedFunctionsQuery,
  useAddOmitedFunctionMutation,
  useModifyOmitedFunctionMutation,
  useDeleteOmitedFunctionMutation,
  useGetNameDiscriminatorQuery,
  useAddNameDiscriminatorMutation,
  useModifyNameDiscriminatorMutation,
  useDeleteNameDiscriminatorMutation,
} = pluginParamsApi;
