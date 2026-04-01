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
  useBulkDeleteContactsMutation,
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
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`${params.title}\n\n${params.message}`);
    return Promise.resolve(ok);
  }

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

  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();
  const [bulkDeleteContacts, { isLoading: isBulkDeleting }] =
    useBulkDeleteContactsMutation();

  const { data: currentUser, isLoading: currentUserLoading } = useGetMeQuery();

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

  // ✅ sélection multi
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

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

  // si on change de filtre, on vide la sélection
  useEffect(() => {
    setSelectedIds(new Set());
  }, [groupId, subGroupId]);

  // si la liste change (suppression/refetch), on retire de la sélection les ids qui n’existent plus
  useEffect(() => {
    const existing = new Set(filteredContacts.map((c) => c.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (existing.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredContacts]);

  const selectionCount = selectedIds.size;
  const deleting = isDeleting || isBulkDeleting;

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setSelectedForMany = useCallback((ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

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

  // suppression unitaire
  const onRequestDelete = useCallback(
    async (contact: Contact) => {
      if (deleting) return;

      const ok = await confirmDelete({
        title: "Supprimer le contact",
        message: `${contact.firstName} ${contact.lastName}\n\nCette action est définitive. Continuer ?`,
      });

      if (!ok) return;

      try {
        await deleteContact({ id: contact.id }).unwrap();

        setPanel((prev) => {
          if (prev?.type === "edit" && prev.contactId === contact.id)
            return null;
          return prev;
        });

        setSelectedIds((prev) => {
          if (!prev.has(contact.id)) return prev;
          const next = new Set(prev);
          next.delete(contact.id);
          return next;
        });
      } catch {
        // optionnel: toast
      }
    },
    [deleteContact, deleting]
  );

  // ✅ suppression multiple via route bulk
  const onRequestDeleteSelected = useCallback(async () => {
    if (deleting) return;
    if (selectedIds.size === 0) return;

    const ids = [...selectedIds];

    const ok = await confirmDelete({
      title: "Supprimer des contacts",
      message: `Vous allez supprimer ${ids.length} contact(s).\n\nCette action est définitive. Continuer ?`,
    });

    if (!ok) return;

    try {
      const res = await bulkDeleteContacts({ ids }).unwrap();

      // si la fiche ouverte correspond à un contact supprimé => fermer
      setPanel((prev) => {
        if (prev?.type !== "edit") return prev;
        if (!prev.contactId) return prev;
        if (ids.includes(prev.contactId)) return null;
        return prev;
      });

      setSelectedIds(new Set());

      // optionnel: si tu veux informer sur notFoundIds
      // if (res.notFoundIds?.length) console.warn("Not found:", res.notFoundIds);
      void res;
    } catch {
      // optionnel: toast
    }
  }, [bulkDeleteContacts, deleting, selectedIds]);

  const columns = useMemo<GridColumnDef<Contact>[]>(
    () => [
      // ✅ Colonne sélection + Select-all sur page courante
      {
        id: "__select__",
        header: ({ table }: any) => {
          const pageRows = table.getPaginationRowModel().rows as any[];
          const pageIds = pageRows.map((r) => r.original.id as string);

          const allSelected =
            pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
          const someSelected = pageIds.some((id) => selectedIds.has(id));

          // Indicateur "intermédiaire"
          const iconName = allSelected
            ? "checkbox"
            : someSelected
            ? "remove-circle-outline"
            : "square-outline";

          return (
            <Pressable
              onPress={() => {
                if (!pageIds.length) return;
                setSelectedForMany(pageIds, !allSelected);
              }}
              hitSlop={10}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allSelected }}
              accessibilityLabel="Sélectionner tous les contacts de la page"
              style={styles.checkboxHeader}
              disabled={deleting}
            >
              <Ionicons
                name={iconName as any}
                size={18}
                color={allSelected ? "#1F536E" : "#64748B"}
              />
            </Pressable>
          );
        },
        enableSorting: false,
        meta: { width: 44 },
        cell: ({ row }) => {
          const id = row.original.id;
          const checked = selectedIds.has(id);

          return (
            <Pressable
              onPress={() => toggleSelected(id)}
              hitSlop={10}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={
                checked
                  ? "Désélectionner le contact"
                  : "Sélectionner le contact"
              }
              style={({ pressed }) => [
                styles.checkboxCell,
                pressed && { opacity: 0.75 },
              ]}
              disabled={deleting}
            >
              <Ionicons
                name={checked ? "checkbox" : "square-outline"}
                size={18}
                color={checked ? "#1F536E" : "#64748B"}
              />
            </Pressable>
          );
        },
      },

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
              disabled={deleting}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                opacity: deleting ? 0.4 : pressed ? 0.7 : 1,
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
              disabled={deleting}
            >
              <Ionicons name="open-outline" size={18} color="#1F536E" />
            </Pressable>
          </View>
        ),
      },
    ],
    [
      deleting,
      formatDateFR,
      onRequestDelete,
      openContactInfos,
      selectedIds,
      setSelectedForMany,
      toggleSelected,
    ]
  );

  const selectedContact =
    panel?.type === "edit"
      ? filteredContacts.find((c) => c.id === panel.contactId) ?? null
      : null;

  const isInfosOpen = panel !== null;
  const canAddContact = !!subGroupId;

  const deleteSelectedDisabled = selectionCount === 0 || deleting;

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
          disabled={groupsLoading || groupOptions.length === 0 || deleting}
        />

        <Select<string>
          label="Sous-Groupe"
          value={subGroupId}
          options={subGroupOptions}
          onChange={(id) => setSubGroupId(id)}
          searchable
          searchPlaceholder="Rechercher un sous-groupe..."
          disabled={!groupId || subGroupOptions.length === 0 || deleting}
        />

        <Pressable
          onPress={() => {
            if (!canAddContact) return;
            setPanel({ type: "create" });
          }}
          disabled={!canAddContact || deleting}
          style={({ pressed }) => [
            styles.addBtn,
            (!canAddContact || deleting) && styles.addBtnDisabled,
            pressed && canAddContact && !deleting && styles.addBtnPressed,
          ]}
        >
          <Text style={styles.addBtnText}>Ajouter Contact</Text>
        </Pressable>

        <Pressable
          onPress={onRequestDeleteSelected}
          disabled={deleteSelectedDisabled}
          style={({ pressed }) => [
            styles.deleteSelectedBtn,
            deleteSelectedDisabled && styles.deleteSelectedBtnDisabled,
            pressed &&
              !deleteSelectedDisabled &&
              styles.deleteSelectedBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Supprimer les contacts sélectionnés"
        >
          <Ionicons name="trash-outline" size={16} color="white" />
          <Text style={styles.deleteSelectedBtnText}>
            Supprimer{selectionCount > 0 ? ` (${selectionCount})` : ""}
          </Text>
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

  deleteSelectedBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#B91C1C",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  deleteSelectedBtnDisabled: {
    backgroundColor: "#FDA4AF",
    opacity: 0.7,
  },
  deleteSelectedBtnPressed: {
    opacity: 0.9,
  },
  deleteSelectedBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },

  checkboxHeader: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCell: {
    width: "100%",
    minHeight: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  rowActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
