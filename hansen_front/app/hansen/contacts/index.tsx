import { ContactInfos } from "@/components/grid/ContactInfos";
import { Grid, GridColumnDef } from "@/components/grid/Grid";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/select.types";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  Contact,
  ContactEmailStatus,
  CONTACT_EMAIL_STATUS_LABEL,
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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Dimensions,
  Modal,
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function StatusHeaderFilterButton(props: {
  value: Status | null;
  onChange: (value: Status | null) => void;
  disabled?: boolean;
}) {
  const { value, onChange, disabled = false } = props;

  const anchorRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const isActive = value !== null;

  const items = useMemo(
    () => [
      { key: "ALL", label: "Tous", value: null as Status | null },
      ...contactStatusOptions.map((opt) => ({
        key: opt.value,
        label: opt.label,
        value: opt.value,
      })),
    ],
    []
  );

  const openMenu = useCallback(() => {
    if (disabled) return;

    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }, [disabled]);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const onSelect = useCallback(
    (next: Status | null) => {
      onChange(next);
      closeMenu();
    },
    [closeMenu, onChange]
  );

  const screenWidth = Dimensions.get("window").width;
  const MENU_WIDTH = 220;

  const menuLeft = anchor
    ? clamp(
        anchor.x + anchor.width - MENU_WIDTH,
        8,
        screenWidth - MENU_WIDTH - 8
      )
    : 8;

  const menuTop = anchor ? anchor.y + anchor.height + 6 : 8;

  const currentLabel = value ? CONTACT_STATUS_LABEL[value] : "Tous";

  return (
    <View ref={anchorRef} collapsable={false} style={styles.statusFilterAnchor}>
      <Pressable
        onPress={openMenu}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Filtrer la liste par statut. Valeur actuelle : ${currentLabel}`}
        style={({ pressed }) => [
          styles.statusFilterBtn,
          isActive && styles.statusFilterBtnActive,
          (pressed || disabled) && styles.statusFilterBtnDim,
        ]}
      >
        <Ionicons
          name={isActive ? "funnel" : "funnel-outline"}
          size={14}
          color={isActive ? "#1F536E" : "#475569"}
        />
        {isActive ? <View style={styles.statusFilterDot} /> : null}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={styles.menuOverlayRoot}>
          <Pressable style={styles.menuOverlayBackdrop} onPress={closeMenu} />

          <View
            style={[
              styles.statusFilterMenu,
              {
                width: MENU_WIDTH,
                left: menuLeft,
                top: menuTop,
              },
            ]}
          >
            <Text style={styles.statusFilterMenuTitle}>Filtrer le statut</Text>
            <Text style={styles.statusFilterMenuSubtitle}>
              Valeur actuelle : {currentLabel}
            </Text>

            <View style={styles.statusFilterMenuDivider} />

            {items.map((item) => {
              const selected =
                item.value === null ? value === null : value === item.value;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => onSelect(item.value)}
                  style={({ pressed }) => [
                    styles.statusFilterMenuItem,
                    selected && styles.statusFilterMenuItemSelected,
                    pressed && styles.statusFilterMenuItemPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusFilterMenuItemText,
                      selected && styles.statusFilterMenuItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>

                  {selected ? (
                    <Ionicons name="checkmark" size={16} color="#1F536E" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
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
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [panel, setPanel] = useState<PanelState>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!groups.length) return;

    const currentIsValid =
      groupId !== null && groups.some((g) => g.id === groupId);
    if (!currentIsValid) {
      setGroupId(groups[0].id);
      setSubGroupId(null);
      setStatusFilter(null);
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
    let list = contacts;

    if (subGroupId) list = list.filter((c) => c.subGroupId === subGroupId);
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);

    return list;
  }, [contacts, subGroupId, statusFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [groupId, subGroupId, statusFilter]);

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
        // optionnel toast
      }
    },
    [deleteContact, deleting]
  );

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
      await bulkDeleteContacts({ ids }).unwrap();

      setPanel((prev) => {
        if (prev?.type !== "edit") return prev;
        if (ids.includes(prev.contactId)) return null;
        return prev;
      });

      setSelectedIds(new Set());
    } catch {
      // optionnel toast
    }
  }, [bulkDeleteContacts, deleting, selectedIds]);

  const getEmailStatusLabel = useCallback(
    (status?: ContactEmailStatus | null) => {
      if (!status) return "";
      return CONTACT_EMAIL_STATUS_LABEL[status] ?? status;
    },
    []
  );

  const getEmailStatusCellStyle = useCallback(
    (status?: ContactEmailStatus | null) => {
      if (
        status === ContactEmailStatus.SPAM ||
        status === ContactEmailStatus.UNSUBSCRIBED ||
        status === ContactEmailStatus.HARD_BOUNCE
      ) {
        return styles.emailStatusErrorBg;
      }

      if (status === ContactEmailStatus.SOFT_BOUNCE) {
        return styles.emailStatusWarningBg;
      }

      return null;
    },
    []
  );

  const buildUpdatePayload = useCallback((row: Contact) => {
    return {
      firstName: row.firstName,
      lastName: row.lastName,
      function: row.function,
      status: row.status,
      email: row.email,
      phoneNumber: row.phoneNumber,
      lastContact: row.lastContact,
      lastEmail: row.lastEmail,
      groupId: row.groupId,
      subGroupId: row.subGroupId,
    };
  }, []);

  const columns = useMemo<GridColumnDef<Contact>[]>(
    () => [
      {
        id: "__select__",
        header: ({ table }: any) => {
          const pageRows = table.getPaginationRowModel().rows as any[];
          const pageIds = pageRows.map((r) => r.original.id as string);

          const allSelected =
            pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
          const someSelected = pageIds.some((id) => selectedIds.has(id));

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
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allSelected }}
              accessibilityLabel="Sélectionner tous les contacts de la page"
              style={styles.checkboxHeader}
              disabled={deleting}
            >
              <Ionicons
                name={iconName as any}
                size={16}
                color={allSelected ? "#1F536E" : "#64748B"}
              />
            </Pressable>
          );
        },
        enableSorting: false,
        meta: { width: 32 },
        cell: ({ row }) => {
          const id = row.original.id;
          const checked = selectedIds.has(id);

          return (
            <Pressable
              onPress={() => toggleSelected(id)}
              hitSlop={8}
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
                size={16}
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
        accessorKey: "emailStatus",
        header: "État email",
        enableSorting: false,
        meta: {
          width: 170,
          cellContainerStyle: ({ row }) =>
            getEmailStatusCellStyle((row as Contact).emailStatus),
        },
        cell: ({ row }) => (
          <Text style={styles.cellText} numberOfLines={1}>
            {getEmailStatusLabel(row.original.emailStatus)}
          </Text>
        ),
      },
      {
        accessorKey: "emailStatusReason",
        header: "Raison",
        enableSorting: false,
        meta: {
          width: 220,
          cellContainerStyle: ({ row }) =>
            getEmailStatusCellStyle((row as Contact).emailStatus),
        },
        cell: ({ row }) => (
          <Text style={styles.cellText} numberOfLines={1}>
            {row.original.emailStatusReason ?? ""}
          </Text>
        ),
      },

      {
        accessorKey: "status",
        header: () => (
          <View style={styles.statusHeader}>
            <Text style={styles.statusHeaderText} numberOfLines={1}>
              Statut
            </Text>

            <StatusHeaderFilterButton
              value={statusFilter}
              onChange={setStatusFilter}
              disabled={deleting}
            />
          </View>
        ),
        enableSorting: false,
        meta: {
          editable: true,
          editor: "select",
          selectOptions: contactStatusOptions,
          width: 150,
          updateValue: (row: Contact, value: unknown) => ({
            ...row,
            status:
              typeof value === "string"
                ? (value as Status)
                : ((value as any)?.value as Status),
          }),
          editorContainerStyle: ({ value }) =>
            String(value) === Status.TO_VERIFY ? styles.statusToVerifyBg : null,
        },
      },

      {
        id: "phoneNumberFirst",
        header: "Téléphone",
        accessorFn: (row) => row.phoneNumber?.[0] ?? "",
        cell: (info) => String(info.getValue() ?? ""),
        meta: {
          editable: true,
          updateValue: (row: Contact, value: unknown) => ({
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
        meta: { width: 64 },
        cell: ({ row }) => (
          <View style={styles.rowActions}>
            <Pressable
              onPress={() => onRequestDelete(row.original)}
              disabled={deleting}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 26,
                height: 26,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                opacity: deleting ? 0.4 : pressed ? 0.7 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Supprimer le contact"
            >
              <Ionicons name="trash-outline" size={16} color="#B91C1C" />
            </Pressable>

            <Pressable
              onPress={() => openContactInfos(row.original)}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 26,
                height: 26,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir la fiche contact"
              disabled={deleting}
            >
              <Ionicons name="open-outline" size={16} color="#1F536E" />
            </Pressable>
          </View>
        ),
      },
    ],
    [
      deleting,
      formatDateFR,
      getEmailStatusCellStyle,
      getEmailStatusLabel,
      onRequestDelete,
      openContactInfos,
      selectedIds,
      setSelectedForMany,
      statusFilter,
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
            setStatusFilter(null);
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
                await updateContact({
                  id: row.id,
                  data: buildUpdatePayload(row),
                }).unwrap();
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
  addBtnDisabled: { backgroundColor: "#94A3B8" },
  addBtnPressed: { opacity: 0.85 },
  addBtnText: { color: "white", fontWeight: "800", fontSize: 13 },

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
  deleteSelectedBtnDisabled: { backgroundColor: "#FDA4AF", opacity: 0.7 },
  deleteSelectedBtnPressed: { opacity: 0.9 },
  deleteSelectedBtnText: { color: "white", fontWeight: "800", fontSize: 13 },

  checkboxHeader: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCell: {
    width: "100%",
    minHeight: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  rowActions: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  statusHeader: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    flexShrink: 1,
  },

  statusFilterAnchor: {
    marginLeft: "auto",
  },
  statusFilterBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  statusFilterBtnActive: {
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
  },
  statusFilterBtnDim: {
    opacity: 0.7,
  },
  statusFilterDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1D4ED8",
  },

  menuOverlayRoot: {
    flex: 1,
  },
  menuOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  statusFilterMenu: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  statusFilterMenuTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  statusFilterMenuSubtitle: {
    fontSize: 12,
    color: "#64748B",
    paddingHorizontal: 8,
    paddingTop: 2,
    paddingBottom: 4,
  },
  statusFilterMenuDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },
  statusFilterMenuItem: {
    minHeight: 38,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusFilterMenuItemSelected: {
    backgroundColor: "#EFF6FF",
  },
  statusFilterMenuItemPressed: {
    opacity: 0.75,
  },
  statusFilterMenuItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  statusFilterMenuItemTextSelected: {
    color: "#1F536E",
    fontWeight: "800",
  },

  statusToVerifyBg: {
    backgroundColor: "#FEF08A",
    borderRadius: 10,
    padding: 2,
  },

  emailStatusErrorBg: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
  },
  emailStatusWarningBg: {
    backgroundColor: "#FED7AA",
    borderRadius: 10,
  },

  cellText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
