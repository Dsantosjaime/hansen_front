import { ContactInfos } from "@/components/grid/ContactInfos";
import { Grid, GridColumnDef } from "@/components/grid/Grid";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/select.types";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  Contact,
  CONTACT_STATUS_LABEL,
  contactStatusOptions,
  Status,
  useDeleteContactMutation,
  useGetContactsByGroupQuery,
  useUpdateContactMutation,
} from "@/services/contactsApi";
import { useGetGroupsQuery } from "@/services/groupsApi";
import { useGetMeQuery } from "@/services/usersApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PanelState =
  | { type: "create" }
  | { type: "edit"; contactId: string }
  | null;

function confirmDelete(params: {
  title: string;
  message: string;
}): Promise<boolean> {
  // ✅ Web: Alert.alert n’affiche souvent rien => fallback confirm()
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`${params.title}\n\n${params.message}`);
    return Promise.resolve(ok);
  }

  // ✅ iOS/Android: Alert natif
  return new Promise((resolve) => {
    Alert.alert(params.title, params.message, [
      { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
      { text: "Supprimer", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

export default function ContactsScreen() {
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const border = useThemeColor({ dark: "#1F2937" }, "text");

  const { data: groups = [], isLoading: groupsLoading } = useGetGroupsQuery();
  const [updateContact] = useUpdateContactMutation();

  // DELETE centralisé (Option B)
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();

  const { data: currentUser, isLoading: currentUserLoading } = useGetMeQuery();

  // Tant que currentUser n'est pas load => copy interdit
  const clipboardEnabled = useMemo(() => {
    if (currentUserLoading) return false;
    const perms = currentUser?.role?.permissions ?? [];
    return perms.some(
      (p: any) => p?.subject === "Contact" && p?.action === "copy"
    );
  }, [currentUserLoading, currentUser]);

  const [groupId, setGroupId] = useState<string | null>(null);
  const [subGroupId, setSubGroupId] = useState<string | null>(null);

  const [panel, setPanel] = useState<PanelState>(null);

  useEffect(() => {
    if (!groups.length) return;

    const currentIsValid =
      groupId !== null && groups.some((g) => g.id === groupId);
    if (!currentIsValid) {
      setGroupId(groups[0].id);
      setSubGroupId(null);
    }
  }, [groups, groupId]);

  const groupOptions = useMemo<SelectOption<string>[]>(
    () => groups.map((g) => ({ value: g.id, label: g.name })),
    [groups]
  );

  const subGroups = useMemo(() => {
    if (!groupId) return [];
    return groups.find((g) => g.id === groupId)?.subGroups ?? [];
  }, [groups, groupId]);

  const subGroupOptions = useMemo<SelectOption<string>[]>(
    () => subGroups.map((sg) => ({ value: sg.id, label: sg.name })),
    [subGroups]
  );

  const { data: contacts = [] } = useGetContactsByGroupQuery(
    groupId ? { groupId } : (undefined as any)
  );

  const filteredContacts = useMemo(() => {
    if (!subGroupId) return contacts;
    return contacts.filter((c) => c.subGroupId === subGroupId);
  }, [contacts, subGroupId]);

  const formatDateFR = useCallback((value: unknown) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  }, []);

  const openContactInfos = useCallback((contact: Contact) => {
    setPanel({ type: "edit", contactId: contact.id });
  }, []);

  // Option B: suppression centralisée + confirmation web/mobile
  const onRequestDelete = useCallback(
    async (contact: Contact) => {
      if (isDeleting) return;

      // Debug si besoin:
      // console.log("delete pressed", contact.id);

      const ok = await confirmDelete({
        title: "Supprimer le contact",
        message: `${contact.firstName} ${contact.lastName}\n\nCette action est définitive. Continuer ?`,
      });

      if (!ok) return;

      try {
        await deleteContact({ id: contact.id }).unwrap();

        // si la fiche ouverte correspond au contact supprimé => fermer
        setPanel((prev) => {
          if (prev?.type === "edit" && prev.contactId === contact.id)
            return null;
          return prev;
        });
      } catch {
        // Optionnel: toast / message d'erreur
      }
    },
    [deleteContact, isDeleting]
  );

  const columns = useMemo<GridColumnDef<Contact>[]>(
    () => [
      { accessorKey: "lastName", header: "Nom", meta: { editable: true } },
      { accessorKey: "firstName", header: "Prénom", meta: { editable: true } },
      {
        accessorKey: "email",
        header: "Email",
        meta: { editable: true, inputType: "email" },
      },
      { accessorKey: "function", header: "Fonction", meta: { editable: true } },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ getValue }) => {
          const v = getValue<Status | string>();
          return CONTACT_STATUS_LABEL[v as Status] ?? String(v);
        },
        meta: {
          editable: true,
          editor: "select",
          selectOptions: contactStatusOptions,
          updateValue: (row: any, value: any) => ({
            ...row,
            status: typeof value === "string" ? value : value?.value,
          }),
        },
      },
      {
        id: "phoneNumberFirst",
        header: "Téléphone",
        accessorFn: (row) => row.phoneNumber?.[0] ?? "",
        cell: (info) => String(info.getValue() ?? ""),
        meta: {
          editable: true,
          updateValue: (row: any, value: unknown) => ({
            ...row,
            phoneNumber: [String(value ?? ""), row.phoneNumber?.[1] ?? ""],
          }),
        },
      },
      {
        accessorKey: "lastEmail",
        header: "Dernier Email",
        meta: { editable: false },
      },
      {
        accessorKey: "lastContact",
        header: "Date de contact",
        cell: (info) => formatDateFR(info.getValue()),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { width: 92 },
        cell: ({ row }) => (
          <View style={styles.rowActions}>
            <Pressable
              onPress={() => onRequestDelete(row.original)}
              disabled={isDeleting}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                opacity: isDeleting ? 0.4 : pressed ? 0.7 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Supprimer le contact"
            >
              <Ionicons name="trash-outline" size={18} color="#B91C1C" />
            </Pressable>

            <Pressable
              onPress={() => openContactInfos(row.original)}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir la fiche contact"
            >
              <Ionicons name="open-outline" size={18} color="#1F536E" />
            </Pressable>
          </View>
        ),
      },
    ],
    [formatDateFR, isDeleting, onRequestDelete, openContactInfos]
  );

  const selectedContact =
    panel?.type === "edit"
      ? filteredContacts.find((c) => c.id === panel.contactId) ?? null
      : null;

  const isInfosOpen = panel !== null;
  const canAddContact = !!subGroupId;

  return (
    <View style={[styles.screen, { backgroundColor: backgroundLight }]}>
      <View style={styles.toolbar}>
        <Select<string>
          label="Groupe"
          value={groupId}
          options={groupOptions}
          onChange={(id) => {
            setGroupId(id);
            setSubGroupId(null);
          }}
          searchable
          searchPlaceholder="Rechercher un groupe..."
          disabled={groupsLoading || groupOptions.length === 0}
        />

        <Select<string>
          label="Sous-Groupe"
          value={subGroupId}
          options={subGroupOptions}
          onChange={(id) => setSubGroupId(id)}
          searchable
          searchPlaceholder="Rechercher un sous-groupe..."
          disabled={!groupId || subGroupOptions.length === 0}
        />

        <Pressable
          onPress={() => {
            if (!canAddContact) return;
            setPanel({ type: "create" });
          }}
          disabled={!canAddContact}
          style={({ pressed }) => [
            styles.addBtn,
            !canAddContact && styles.addBtnDisabled,
            pressed && canAddContact && styles.addBtnPressed,
          ]}
        >
          <Text style={styles.addBtnText}>Ajouter Contact</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={[styles.panelContainer, { borderColor: border }]}>
          <View style={{ flex: 1, display: isInfosOpen ? "none" : "flex" }}>
            <Grid
              data={filteredContacts}
              columns={columns}
              pageSize={10}
              clipboardEnabled={clipboardEnabled}
              onCellUpdate={async ({ row }) => {
                const { id, ...data } = row;
                await updateContact({ id, data }).unwrap();
              }}
            />
          </View>

          <View style={{ flex: 1, display: isInfosOpen ? "flex" : "none" }}>
            <ContactInfos
              mode={panel?.type === "create" ? "create" : "edit"}
              initialContact={selectedContact}
              groupIdSelected={groupId}
              subGroupIdSelected={subGroupId}
              onClose={() => setPanel(null)}
              onRequestDelete={onRequestDelete}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  toolbar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    justifyContent: "flex-start",
    flexWrap: "wrap",
  },
  content: { marginTop: 16, flex: 1 },
  panelContainer: {
    flex: 1,
    borderRadius: 14,
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  addBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1F536E",
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  addBtnPressed: {
    opacity: 0.85,
  },
  addBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },
  rowActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
