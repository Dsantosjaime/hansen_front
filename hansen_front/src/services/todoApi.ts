import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithKeycloakRefresh } from "./baseQueryWithKeycloak";

export enum ToDoType {
  REMINDER = "REMINDER",
  SERVICE = "SERVICE",
}

export type Todo = {
  id: string;
  contactId: string;
  type: ToDoType;
  title: string;
  toDoAt: string; // ISO
  done: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type CreateTodoDto = {
  contactId: string;
  type: ToDoType;
  title: string;
  toDoAt: string; // ISO
  done?: boolean;
};

export type UpdateTodoDto = Partial<Omit<CreateTodoDto, "contactId">> & {
  contactId?: string;
};

export const todoApi = createApi({
  reducerPath: "todoApi",
  tagTypes: ["Todos"],
  baseQuery: baseQueryWithKeycloakRefresh,
  endpoints: (builder) => ({
    /**
     * GET /todos?contactId=...
     * contactId obligatoire (comme demandé)
     */
    getTodosByContact: builder.query<Todo[], { contactId: string }>({
      query: ({ contactId }) => ({
        url: "/todos",
        method: "GET",
        params: { contactId },
      }),
      providesTags: (result, _err, arg) =>
        result
          ? [
              { type: "Todos", id: `LIST-${arg.contactId}` },
              ...result.map((t) => ({ type: "Todos" as const, id: t.id })),
            ]
          : [{ type: "Todos", id: `LIST-${arg.contactId}` }],
    }),

    /**
     * GET /todos/:id
     * (on garde contactId dans l'arg pour invalider la bonne liste)
     */
    getTodoById: builder.query<Todo, { id: string; contactId: string }>({
      query: ({ id }) => ({
        url: `/todos/${id}`,
        method: "GET",
      }),
      providesTags: (_res, _err, arg) => [
        { type: "Todos", id: arg.id },
        { type: "Todos", id: `LIST-${arg.contactId}` },
      ],
    }),

    /**
     * POST /todos
     */
    createTodo: builder.mutation<Todo, CreateTodoDto>({
      query: (body) => ({
        url: "/todos",
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Todos", id: `LIST-${arg.contactId}` },
      ],
    }),

    /**
     * PATCH /todos/:id
     * Ici on demande contactId aussi pour invalider la liste
     */
    updateTodo: builder.mutation<
      Todo,
      { id: string; contactId: string; data: UpdateTodoDto }
    >({
      query: ({ id, data }) => ({
        url: `/todos/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Todos", id: arg.id },
        { type: "Todos", id: `LIST-${arg.contactId}` },
      ],
    }),

    /**
     * DELETE /todos/:id
     * Ici on demande contactId aussi pour invalider la liste
     */
    deleteTodo: builder.mutation<Todo, { id: string; contactId: string }>({
      query: ({ id }) => ({
        url: `/todos/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Todos", id: arg.id },
        { type: "Todos", id: `LIST-${arg.contactId}` },
      ],
    }),
  }),
});

export const {
  useGetTodosByContactQuery,
  useGetTodoByIdQuery,
  useCreateTodoMutation,
  useUpdateTodoMutation,
  useDeleteTodoMutation,
} = todoApi;
