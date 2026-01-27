import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { AuthState } from "@/slices/authSlice";

type StateWithAuth = { auth: AuthState };

export type Email = {
  id: string;
  subject: string;
  template: {
    id: string;
    name: string;
  };
  groups: {
    id: string;
    name: string;
    subGroups: {
      id: string;
      name: string;
    }[];
  }[];
  sendingDate: string;
  status: string;
  sender: {
    id: string;
    name: string;
  };
};

export type EmailGrid = Omit<Email, "groups">;

// --------------------
// Mock store
// --------------------
let mockEmails: Email[] = [
  {
    id: "email-1",
    subject: "Relance documents manquants",
    template: { id: "tpl-1", name: "Relance" },
    groups: [
      {
        id: "1",
        name: "Groupe A",
        subGroups: [
          { id: "1", name: "Sous-Groupe A1" },
          { id: "2", name: "Sous-Groupe A2" },
        ],
      },
    ],
    sendingDate: new Date().toISOString(),
    status: "DRAFT",
    sender: { id: "u-1", name: "Jean de la Compta" },
  },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const uid = () => `email-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toEmailGrid = (e: Email): EmailGrid => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { groups, ...rest } = e;
  return rest;
};

export const emailsApi = createApi({
  reducerPath: "emailsApi",
  tagTypes: ["Emails", "Email"],
  baseQuery: fetchBaseQuery({
    baseUrl: "https://api.example.com",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as StateWithAuth).auth.token;
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getEmails: builder.query<EmailGrid[], void>({
      async queryFn() {
        await sleep(400);
        return { data: mockEmails.map(toEmailGrid) };
      },
      providesTags: (result) =>
        result
          ? [
              { type: "Emails", id: "LIST" },
              ...result.map((e) => ({ type: "Emails" as const, id: e.id })),
            ]
          : [{ type: "Emails", id: "LIST" }],
    }),

    getEmail: builder.query<Email, { idEmail: string }>({
      async queryFn({ idEmail }) {
        await sleep(300);
        const found = mockEmails.find((e) => e.id === idEmail);
        if (!found) {
          return { error: { status: 404, data: "Email not found" } as any };
        }
        return { data: found };
      },
      providesTags: (_res, _err, arg) => [{ type: "Email", id: arg.idEmail }],
    }),

    sendEmail: builder.mutation<Email, { email: Email }>({
      async queryFn({ email }) {
        await sleep(700);

        const sent: Email = {
          ...email,
          id: email.id?.trim() ? email.id : uid(),
          status: "SENT",
          sendingDate: email.sendingDate?.trim()
            ? email.sendingDate
            : new Date().toISOString(),
        };

        const idx = mockEmails.findIndex((e) => e.id === sent.id);
        if (idx >= 0) mockEmails[idx] = sent;
        else mockEmails = [sent, ...mockEmails];

        return { data: sent };
      },
      invalidatesTags: (res) =>
        res
          ? [
              { type: "Emails", id: "LIST" },
              { type: "Emails", id: res.id },
              { type: "Email", id: res.id },
            ]
          : [{ type: "Emails", id: "LIST" }],
    }),
  }),
});

export const { useGetEmailsQuery, useGetEmailQuery, useSendEmailMutation } =
  emailsApi;
