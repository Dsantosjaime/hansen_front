import Ionicons from "@expo/vector-icons/build/Ionicons";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CellUpdatePayload, Grid, GridColumnDef } from "@/components/grid/Grid";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/select.types";
import { useThemeColor } from "@/hooks/use-theme-color";

import { useGetRolesQuery } from "@/services/rolesApi";
import {
  ModifyUserInput,
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetUsersQuery,
  useModifyUserMutation,
} from "@/services/usersApi";
import { User } from "@/types/user";
import { UserRulesGroup } from "@/types/userRulesGroup";

type ConfirmState =
  | { open: false }
  | {
      open: true;
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      onConfirm: () => void | Promise<void>;
    };

// Mapping colonne grid → champ ModifyUserInput
// Permet d'envoyer un patch minimal (uniquement la cellule modifiée)
const COLUMN_TO_FIELD: Record<string, keyof ModifyUserInput> = {
  name: "name",
  email: "email",
  jobTitle: "jobTitle",
  phoneFixed: "phoneFixed",
  phoneMobile: "phoneMobile",
  role: "roleId",
};

// Colonnes dont la valeur vide doit devenir null (champs nullables en BDD)
const NULLABLE_FIELDS = new Set<keyof ModifyUserInput>([
  "jobTitle",
  "phoneFixed",
  "phoneMobile",
]);

export default function UsersScreen() {
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({}, "text");
  const textDark = useThemeColor({}, "textDark");
  const border = useThemeColor({ dark: "#1F2937" }, "text");

  const { data: users = [] } = useGetUsersQuery();
  const { data: userRoles = [] } = useGetRolesQuery();

  const [deleteUser] = useDeleteUserMutation();
  const [modifyUser] = useModifyUserMutation();
  const [addUser] = useCreateUserMutation();

  // --- Confirm modal delete
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const closeConfirm = useCallback(() => setConfirm({ open: false }), []);

  const confirmDeleteUser = useCallback(
    (userId: string) => {
      setConfirm({
        open: true,
        title: "Confirmer la suppression",
        message: "Cet utilisateur sera définitivement supprimé",
        confirmText: "Valider",
        cancelText: "Annuler",
        onConfirm: async () => {
          await deleteUser({ id: userId }).unwrap?.();
          closeConfirm();
        },
      });
    },
    [closeConfirm, deleteUser]
  );

  // PATCH minimal : envoie uniquement la cellule modifiée
  const handleModifyUser = useCallback(
    async (payload: CellUpdatePayload<User>) => {
      const { row, columnId, value } = payload;
      const field = COLUMN_TO_FIELD[columnId];
      if (!field) return;

      const raw = typeof value === "string" ? value.trim() : value ?? "";
      const isEmpty = raw === "" || raw === null || raw === undefined;

      // Champs nullables : vide → null (efface en BDD)
      // Autres champs : on n'envoie pas si vide pour éviter d'écraser une valeur requise
      let nextValue: string | null;
      if (NULLABLE_FIELDS.has(field)) {
        nextValue = isEmpty ? null : String(raw);
      } else {
        if (isEmpty) return; // ne rien envoyer pour les champs requis vidés
        nextValue = String(raw);
      }

      const patch: ModifyUserInput = { id: row.id, [field]: nextValue };
      await modifyUser(patch).unwrap?.();
    },
    [modifyUser]
  );

  const roleOptions = useMemo<SelectOption<string>[]>(
    () =>
      userRoles.map((g: UserRulesGroup) => ({
        value: g.id,
        label: g.name,
      })),
    [userRoles]
  );

  // --- UI création user (au-dessus de la grid)
  const [isCreating, setIsCreating] = useState(false);
  const [draftEmail, setDraftEmail] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftRoleId, setDraftRoleId] = useState<string | null>(null);
  const [draftPswd, setDraftPwsd] = useState("");
  const [draftJobTitle, setDraftJobTitle] = useState("");
  const [draftPhoneFixed, setDraftPhoneFixed] = useState("");
  const [draftPhoneMobile, setDraftPhoneMobile] = useState("");

  const canSave = useMemo(() => {
    return (
      !!draftEmail.trim() &&
      !!draftName.trim() &&
      !!draftRoleId &&
      !!draftRoleId.trim() &&
      !!draftPswd.trim()
    );
  }, [draftEmail, draftName, draftRoleId, draftPswd]);

  const resetDraft = useCallback(() => {
    setDraftEmail("");
    setDraftName("");
    setDraftRoleId(null);
    setDraftPwsd("");
    setDraftJobTitle("");
    setDraftPhoneFixed("");
    setDraftPhoneMobile("");
  }, []);

  const startCreate = useCallback(() => {
    setIsCreating(true);
    resetDraft();
  }, [resetDraft]);

  const cancelCreate = useCallback(() => {
    setIsCreating(false);
    resetDraft();
  }, [resetDraft]);

  const saveCreate = useCallback(async () => {
    if (!canSave) return;

    await addUser({
      email: draftEmail.trim(),
      name: draftName.trim(),
      roleId: draftRoleId!,
      temporaryPassword: draftPswd.trim(),
      ...(draftJobTitle.trim() ? { jobTitle: draftJobTitle.trim() } : {}),
      ...(draftPhoneFixed.trim() ? { phoneFixed: draftPhoneFixed.trim() } : {}),
      ...(draftPhoneMobile.trim()
        ? { phoneMobile: draftPhoneMobile.trim() }
        : {}),
    }).unwrap?.();

    setIsCreating(false);
    resetDraft();
  }, [
    addUser,
    canSave,
    draftEmail,
    draftName,
    draftPswd,
    draftRoleId,
    draftJobTitle,
    draftPhoneFixed,
    draftPhoneMobile,
    resetDraft,
  ]);

  const columns = useMemo<GridColumnDef<User>[]>(
    () => [
      { accessorKey: "name", header: "Nom", meta: { editable: true } },
      {
        accessorKey: "email",
        header: "Email",
        meta: { editable: true, inputType: "email" },
      },
      {
        accessorKey: "jobTitle",
        header: "Poste",
        meta: { editable: true },
      },
      {
        accessorKey: "phoneFixed",
        header: "Tél. fixe",
        meta: { editable: true, inputType: "tel" },
      },
      {
        accessorKey: "phoneMobile",
        header: "Tél. mobile",
        meta: { editable: true, inputType: "tel" },
      },
      {
        id: "role",
        header: "Role",
        accessorFn: (row) => row.role?.id ?? "",
        cell: ({ row }) => row.original.role?.name ?? "",
        meta: {
          editable: true,
          editor: "select",
          selectOptions: roleOptions,
          // Préserve permissions et autres champs internes du role
          updateValue: (row: User, value: unknown): User => {
            const roleId = String(value ?? "");
            const newRoleLabel =
              roleOptions.find((o) => o.value === roleId)?.label ?? "";
            return {
              ...row,
              roleId,
              role: row.role
                ? { ...row.role, id: roleId, name: newRoleLabel }
                : row.role,
            };
          },
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { width: 56 },
        cell: ({ row }) => (
          <Pressable
            onPress={() => confirmDeleteUser(row.original.id)}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
              marginLeft: "auto",
            })}
            accessibilityRole="button"
            accessibilityLabel="Supprimer l'utilisateur"
          >
            <Ionicons name="trash-outline" size={18} color="#1F536E" />
          </Pressable>
        ),
      },
    ],
    [roleOptions, confirmDeleteUser]
  );

  return (
    <View style={[styles.container, { backgroundColor: backgroundLight }]}>
      <ConfirmDialog
        open={confirm.open}
        title={confirm.open ? confirm.title : ""}
        message={confirm.open ? confirm.message : ""}
        confirmText={confirm.open ? confirm.confirmText : undefined}
        cancelText={confirm.open ? confirm.cancelText : undefined}
        onCancel={closeConfirm}
        onConfirm={confirm.open ? confirm.onConfirm : () => {}}
        danger
      />

      <View style={styles.usersToolbar}>
        <Pressable
          onPress={isCreating ? cancelCreate : startCreate}
          style={({ pressed }) => [
            styles.addUserBtn,
            { backgroundColor: backgroundSecond, borderColor: border },
            { opacity: pressed ? 0.8 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isCreating ? "Annuler" : "Ajouter un utilisateur"}
        >
          <Ionicons
            name={isCreating ? "close" : "add"}
            size={22}
            color={text}
          />
          <Text style={[styles.addUserBtnText, { color: text }]}>
            {isCreating ? "Annuler" : "Ajouter un utilisateur"}
          </Text>
        </Pressable>

        {isCreating ? (
          <View style={styles.createForm}>
            <TextInput
              value={draftEmail}
              onChangeText={setDraftEmail}
              placeholder="Email *"
              placeholderTextColor={textDark}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                {
                  borderColor: border,
                  color: textDark,
                  backgroundColor: "white",
                },
              ]}
            />

            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Nom *"
              placeholderTextColor={textDark}
              style={[
                styles.input,
                {
                  borderColor: border,
                  color: textDark,
                  backgroundColor: "white",
                },
              ]}
            />

            <TextInput
              value={draftPswd}
              onChangeText={setDraftPwsd}
              placeholder="Mot de passe temporaire *"
              placeholderTextColor={textDark}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="newPassword"
              style={[
                styles.input,
                {
                  borderColor: border,
                  color: textDark,
                  backgroundColor: "white",
                },
              ]}
            />

            <TextInput
              value={draftJobTitle}
              onChangeText={setDraftJobTitle}
              placeholder="Poste"
              placeholderTextColor={textDark}
              style={[
                styles.input,
                {
                  borderColor: border,
                  color: textDark,
                  backgroundColor: "white",
                },
              ]}
            />

            <TextInput
              value={draftPhoneFixed}
              onChangeText={setDraftPhoneFixed}
              placeholder="Tél. fixe"
              placeholderTextColor={textDark}
              keyboardType="phone-pad"
              style={[
                styles.input,
                {
                  borderColor: border,
                  color: textDark,
                  backgroundColor: "white",
                },
              ]}
            />

            <TextInput
              value={draftPhoneMobile}
              onChangeText={setDraftPhoneMobile}
              placeholder="Tél. mobile"
              placeholderTextColor={textDark}
              keyboardType="phone-pad"
              style={[
                styles.input,
                {
                  borderColor: border,
                  color: textDark,
                  backgroundColor: "white",
                },
              ]}
            />

            <Select<string>
              label="Role *"
              value={draftRoleId}
              options={roleOptions}
              onChange={(id) => setDraftRoleId(id)}
              searchable
              searchPlaceholder="Choisir un rôle..."
              disabled={roleOptions.length === 0}
            />

            <Pressable
              onPress={saveCreate}
              disabled={!canSave}
              hitSlop={10}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: backgroundSecond,
                  borderColor: border,
                  opacity: !canSave ? 0.4 : pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sauvegarder l'utilisateur"
            >
              <Ionicons name="save-outline" size={20} color={text} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={[styles.panel, { borderColor: border }]}>
        <Grid
          data={users}
          columns={columns}
          pageSize={10}
          onCellUpdate={handleModifyUser}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  panel: {
    flex: 1,
    overflow: "hidden",
  },
  usersToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  addUserBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addUserBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  createForm: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    minWidth: 320,
    flexWrap: "wrap",
  },
  input: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "700",
    minWidth: 180,
  },
  saveBtn: {
    height: 42,
    width: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
