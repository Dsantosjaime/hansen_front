import {
  EmailTemplateOption,
  MultiSelectionOptions,
} from "@/components/contacts/MultiSelectionOptions";
import { ContactInfos } from "@/components/grid/ContactInfos";
import { Grid, GridColumnDef } from "@/components/grid/Grid";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/select.types";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  BulkUpdateEmailsResult,
  Contact,
  ContactEmailStatus,
  CONTACT_EMAIL_STATUS_LABEL,
  CONTACT_STATUS_LABEL,
  contactStatusOptions,
  Status,
  useBulkDeleteContactsMutation,
  useBulkUpdateEmailsMutation,
  useDeleteContactMutation,
  useGetContactsByGroupQuery,
  useUpdateContactMutation,
} from "@/services/contactsApi";
import { useGetEmailAddressTemplatesQuery } from "@/services/emailAddressTemplatesApi";
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
  TextInput,
  View,
} from "react-native";

type PanelState =
  | { type: "create" }
  | { type: "edit"; contactId: string }
  | null;

type ContactSearchField =
  | "lastName"
  | "firstName"
  | "email"
  | "function"
  | "emailStatusReason"
  | "phoneNumberFirst"
  | "lastEmail";

type ColumnSearchState = Partial<Record<ContactSearchField, string>>;

type SearchModalState = {
  open: boolean;
  field: ContactSearchField | null;
  title: string;
  value: string;
};

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

function showInfo(params: { title: string; message: string }) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(`${params.title}\n\n${params.message}`);
    return;
  }

  Alert.alert(params.title, params.message);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getContactFieldSearchValue(
  contact: Contact,
  field: ContactSearchField
): string {
  switch (field) {
    case "lastName":
      return contact.lastName ?? "";
    case "firstName":
      return contact.firstName ?? "";
    case "email":
      return contact.email ?? "";
    case "function":
      return contact.function ?? "";
    case "emailStatusReason":
      return contact.emailStatusReason ?? "";
    case "phoneNumberFirst":
      return contact.phoneNumber?.[0] ?? "";
    case "lastEmail":
      return contact.lastEmail ?? "";
    default:
      return "";
  }
}

function HeaderSearchButton(props: {
  title: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { title, active, onPress, disabled = false } = props;

  return (
    <View style={styles.headerSearchAnchor}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Rechercher dans la colonne ${title}`}
        style={({ pressed }) => [
          styles.headerSearchBtn,
          active && styles.headerSearchBtnActive,
          (pressed || disabled) && styles.headerSearchBtnDim,
        ]}
      >
        <Ionicons
          name={active ? "search" : "search-outline"}
          size={14}
          color={active ? "#1F536E" : "#475569"}
        />
        {active ? <View style={styles.headerSearchDot} /> : null}
      </Pressable>
    </View>
  );
}

function SearchableTextHeader(props: {
  title: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.searchableHeader}>
      <Text style={styles.searchableHeaderText} numberOfLines={1}>
        {props.title}
      </Text>

      <HeaderSearchButton
        title={props.title}
        active={props.active}
        onPress={props.onPress}
        disabled={props.disabled}
      />
    </View>
  );
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

function EmailStatusHeaderFilterButton(props: {
  value: ContactEmailStatus | null;
  onChange: (value: ContactEmailStatus | null) => void;
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
      { key: "ALL", label: "Tous", value: null as ContactEmailStatus | null },
      ...Object.values(ContactEmailStatus).map((status) => ({
        key: status,
        label: CONTACT_EMAIL_STATUS_LABEL[status],
        value: status,
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
    (next: ContactEmailStatus | null) => {
      onChange(next);
      closeMenu();
    },
    [closeMenu, onChange]
  );

  const screenWidth = Dimensions.get("window").width;
  const MENU_WIDTH = 240;

  const menuLeft = anchor
    ? clamp(
        anchor.x + anchor.width - MENU_WIDTH,
        8,
        screenWidth - MENU_WIDTH - 8
      )
    : 8;

  const menuTop = anchor ? anchor.y + anchor.height + 6 : 8;

  const currentLabel = value ? CONTACT_EMAIL_STATUS_LABEL[value] : "Tous";

  return (
    <View ref={anchorRef} collapsable={false} style={styles.statusFilterAnchor}>
      <Pressable
        onPress={openMenu}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Filtrer la liste par état email. Valeur actuelle : ${currentLabel}`}
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
            <Text style={styles.statusFilterMenuTitle}>
              {"Filtrer l'état email"}
            </Text>
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

function buildBulkUpdateSummary(result: BulkUpdateEmailsResult) {
  const lines = [
    `Demandés : ${result.requestedCount}`,
    `Trouvés : ${result.foundCount}`,
    `Mis à jour : ${result.updatedCount}`,
  ];

  if (result.unchangedCount > 0)
    lines.push(`Inchangés : ${result.unchangedCount}`);
  if (result.invalidCount > 0) lines.push(`Invalides : ${result.invalidCount}`);
  if (result.conflictCount > 0)
    lines.push(`Conflits : ${result.conflictCount}`);
  if (result.errorCount > 0) lines.push(`Erreurs : ${result.errorCount}`);
  if (result.notFoundIds.length > 0) {
    lines.push(`Introuvables : ${result.notFoundIds.length}`);
  }

  return lines.join("\n");
}

export default function ContactsScreen() {
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const border = useThemeColor({ dark: "#1F2937" }, "text");

  const { data: groups = [], isLoading: groupsLoading } = useGetGroupsQuery();
  const { data: emailAddressTemplates = [], isLoading: emailTemplatesLoading } =
    useGetEmailAddressTemplatesQuery({ activeOnly: true });

  const [updateContact] = useUpdateContactMutation();

  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();
  const [bulkDeleteContacts, { isLoading: isBulkDeleting }] =
    useBulkDeleteContactsMutation();
  const [bulkUpdateEmails, { isLoading: isBulkUpdatingEmails }] =
    useBulkUpdateEmailsMutation();

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
  const [emailStatusFilter, setEmailStatusFilter] =
    useState<ContactEmailStatus | null>(null);
  const [columnSearch, setColumnSearch] = useState<ColumnSearchState>({});
  const [searchModal, setSearchModal] = useState<SearchModalState>({
    open: false,
    field: null,
    title: "",
    value: "",
  });
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
      setEmailStatusFilter(null);
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

  const templateOptions = useMemo<EmailTemplateOption[]>(
    () =>
      emailAddressTemplates.map((tpl) => ({
        value: tpl.id,
        label: tpl.name,
        pattern: tpl.pattern,
      })),
    [emailAddressTemplates]
  );

  const { data: contacts = [] } = useGetContactsByGroupQuery(
    groupId ? { groupId } : (undefined as any)
  );

  const setColumnSearchValue = useCallback(
    (field: ContactSearchField, value: string) => {
      setColumnSearch((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const openColumnSearch = useCallback(
    (field: ContactSearchField, title: string) => {
      setSearchModal({
        open: true,
        field,
        title,
        value: columnSearch[field] ?? "",
      });
    },
    [columnSearch]
  );

  const closeColumnSearch = useCallback(() => {
    setSearchModal((prev) => ({
      ...prev,
      open: false,
    }));
  }, []);

  const updateSearchModalValue = useCallback(
    (nextValue: string) => {
      setSearchModal((prev) => ({
        ...prev,
        value: nextValue,
      }));

      setColumnSearch((prev) => {
        const field = searchModal.field;
        if (!field) return prev;
        return {
          ...prev,
          [field]: nextValue,
        };
      });
    },
    [searchModal.field]
  );

  const clearActiveSearch = useCallback(() => {
    if (!searchModal.field) return;

    setColumnSearch((prev) => ({
      ...prev,
      [searchModal.field as ContactSearchField]: "",
    }));

    setSearchModal((prev) => ({
      ...prev,
      value: "",
    }));
  }, [searchModal.field]);

  const filteredContacts = useMemo(() => {
    let list = contacts;

    if (subGroupId) list = list.filter((c) => c.subGroupId === subGroupId);
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    if (emailStatusFilter) {
      list = list.filter((c) => c.emailStatus === emailStatusFilter);
    }

    const activeSearchEntries = Object.entries(columnSearch).filter(
      ([, value]) => String(value ?? "").trim().length > 0
    ) as [ContactSearchField, string][];

    if (activeSearchEntries.length > 0) {
      list = list.filter((contact) =>
        activeSearchEntries.every(([field, rawQuery]) => {
          const query = normalizeSearchText(rawQuery);
          if (!query) return true;

          const value = normalizeSearchText(
            getContactFieldSearchValue(contact, field)
          );

          return value.includes(query);
        })
      );
    }

    return list;
  }, [contacts, subGroupId, statusFilter, emailStatusFilter, columnSearch]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [groupId, subGroupId, statusFilter, emailStatusFilter, columnSearch]);

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
  const actionsBusy = isDeleting || isBulkDeleting || isBulkUpdatingEmails;

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
      if (actionsBusy) return;

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
        //
      }
    },
    [actionsBusy, deleteContact]
  );

  const onRequestDeleteSelected = useCallback(async () => {
    if (actionsBusy) return;
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
      //
    }
  }, [actionsBusy, bulkDeleteContacts, selectedIds]);

  const onRequestBulkUpdateEmails = useCallback(
    async (payload: { pattern: string; domain: string; extension: string }) => {
      if (actionsBusy) return;
      if (selectedIds.size === 0) return;

      const ids = [...selectedIds];

      try {
        const result = await bulkUpdateEmails({
          ids,
          ...payload,
        }).unwrap();

        showInfo({
          title: "Mise à jour des emails",
          message: buildBulkUpdateSummary(result),
        });

        setSelectedIds(new Set());
      } catch {
        showInfo({
          title: "Erreur",
          message: "Une erreur est survenue pendant la mise à jour des emails.",
        });
      }
    },
    [actionsBusy, bulkUpdateEmails, selectedIds]
  );

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
          const filteredIds = filteredContacts.map((c) => c.id);

          const allPageSelected =
            pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
          const somePageSelected = pageIds.some((id) => selectedIds.has(id));

          const allFilteredSelected =
            filteredIds.length > 0 &&
            filteredIds.every((id) => selectedIds.has(id));
          const someFilteredSelected = filteredIds.some((id) =>
            selectedIds.has(id)
          );

          const pageIconName = allPageSelected
            ? "checkbox"
            : somePageSelected
            ? "remove-circle-outline"
            : "square-outline";

          const allIconName = allFilteredSelected ? "layers" : "layers-outline";

          return (
            <View style={styles.checkboxHeaderGroup}>
              <Pressable
                onPress={() => {
                  if (!pageIds.length) return;
                  setSelectedForMany(pageIds, !allPageSelected);
                }}
                hitSlop={8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: allPageSelected }}
                accessibilityLabel="Sélectionner tous les contacts de la page courante"
                style={({ pressed }) => [
                  styles.checkboxHeaderBtn,
                  allPageSelected && styles.checkboxHeaderBtnActive,
                  pressed && { opacity: 0.75 },
                ]}
                disabled={actionsBusy}
              >
                <Ionicons
                  name={pageIconName as any}
                  size={16}
                  color={
                    allPageSelected || somePageSelected ? "#1F536E" : "#64748B"
                  }
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!filteredIds.length) return;
                  setSelectedForMany(filteredIds, !allFilteredSelected);
                }}
                hitSlop={8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: allFilteredSelected }}
                accessibilityLabel="Sélectionner tous les contacts actuellement affichés par la grille"
                style={({ pressed }) => [
                  styles.checkboxHeaderBtn,
                  (allFilteredSelected || someFilteredSelected) &&
                    styles.checkboxHeaderBtnActive,
                  pressed && { opacity: 0.75 },
                ]}
                disabled={actionsBusy || filteredIds.length === 0}
              >
                <Ionicons
                  name={allIconName as any}
                  size={15}
                  color={
                    allFilteredSelected || someFilteredSelected
                      ? "#1F536E"
                      : "#64748B"
                  }
                />
              </Pressable>
            </View>
          );
        },
        enableSorting: false,
        meta: { width: 58 },
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
              disabled={actionsBusy}
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

      {
        accessorKey: "lastName",
        header: () => (
          <SearchableTextHeader
            title="Nom"
            active={(columnSearch.lastName ?? "").trim().length > 0}
            onPress={() => openColumnSearch("lastName", "Nom")}
            disabled={actionsBusy}
          />
        ),
        meta: { editable: true },
      },
      {
        accessorKey: "firstName",
        header: () => (
          <SearchableTextHeader
            title="Prénom"
            active={(columnSearch.firstName ?? "").trim().length > 0}
            onPress={() => openColumnSearch("firstName", "Prénom")}
            disabled={actionsBusy}
          />
        ),
        meta: { editable: true },
      },
      {
        accessorKey: "email",
        header: () => (
          <SearchableTextHeader
            title="Email"
            active={(columnSearch.email ?? "").trim().length > 0}
            onPress={() => openColumnSearch("email", "Email")}
            disabled={actionsBusy}
          />
        ),
        meta: { editable: true, inputType: "email" },
      },
      {
        accessorKey: "function",
        header: () => (
          <SearchableTextHeader
            title="Fonction"
            active={(columnSearch.function ?? "").trim().length > 0}
            onPress={() => openColumnSearch("function", "Fonction")}
            disabled={actionsBusy}
          />
        ),
        meta: { editable: true },
      },

      {
        accessorKey: "emailStatus",
        header: () => (
          <View style={styles.statusHeader}>
            <Text style={styles.statusHeaderText} numberOfLines={1}>
              État email
            </Text>

            <EmailStatusHeaderFilterButton
              value={emailStatusFilter}
              onChange={setEmailStatusFilter}
              disabled={actionsBusy}
            />
          </View>
        ),
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
        header: () => (
          <SearchableTextHeader
            title="Raison"
            active={(columnSearch.emailStatusReason ?? "").trim().length > 0}
            onPress={() => openColumnSearch("emailStatusReason", "Raison")}
            disabled={actionsBusy}
          />
        ),
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
              disabled={actionsBusy}
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
        header: () => (
          <SearchableTextHeader
            title="Téléphone"
            active={(columnSearch.phoneNumberFirst ?? "").trim().length > 0}
            onPress={() => openColumnSearch("phoneNumberFirst", "Téléphone")}
            disabled={actionsBusy}
          />
        ),
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
        header: () => (
          <SearchableTextHeader
            title="Dernier Email"
            active={(columnSearch.lastEmail ?? "").trim().length > 0}
            onPress={() => openColumnSearch("lastEmail", "Dernier Email")}
            disabled={actionsBusy}
          />
        ),
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
              disabled={actionsBusy}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 26,
                height: 26,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                opacity: actionsBusy ? 0.4 : pressed ? 0.7 : 1,
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
              disabled={actionsBusy}
            >
              <Ionicons name="open-outline" size={16} color="#1F536E" />
            </Pressable>
          </View>
        ),
      },
    ],
    [
      actionsBusy,
      columnSearch.email,
      columnSearch.emailStatusReason,
      columnSearch.firstName,
      columnSearch.function,
      columnSearch.lastEmail,
      columnSearch.lastName,
      columnSearch.phoneNumberFirst,
      emailStatusFilter,
      filteredContacts,
      formatDateFR,
      getEmailStatusCellStyle,
      getEmailStatusLabel,
      onRequestDelete,
      openColumnSearch,
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
            setEmailStatusFilter(null);
          }}
          searchable
          searchPlaceholder="Rechercher un groupe..."
          disabled={groupsLoading || groupOptions.length === 0 || actionsBusy}
        />

        <Select<string>
          label="Sous-Groupe"
          value={subGroupId}
          options={subGroupOptions}
          onChange={(id) => setSubGroupId(id)}
          searchable
          searchPlaceholder="Rechercher un sous-groupe..."
          disabled={!groupId || subGroupOptions.length === 0 || actionsBusy}
        />

        <Pressable
          onPress={() => {
            if (!canAddContact) return;
            setPanel({ type: "create" });
          }}
          disabled={!canAddContact || actionsBusy}
          style={({ pressed }) => [
            styles.addBtn,
            (!canAddContact || actionsBusy) && styles.addBtnDisabled,
            pressed && canAddContact && !actionsBusy && styles.addBtnPressed,
          ]}
        >
          <Text style={styles.addBtnText}>Ajouter Contact</Text>
        </Pressable>

        <MultiSelectionOptions
          selectedCount={selectionCount}
          disabled={actionsBusy}
          onDelete={onRequestDeleteSelected}
          onApplyEmailTemplate={onRequestBulkUpdateEmails}
          templateOptions={templateOptions}
          templatesLoading={emailTemplatesLoading}
        />
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

      <Modal
        visible={searchModal.open}
        transparent
        animationType="fade"
        onRequestClose={closeColumnSearch}
      >
        <View style={styles.menuOverlayRoot}>
          <Pressable
            style={styles.menuOverlayBackdrop}
            onPress={closeColumnSearch}
          />

          <View style={styles.headerSearchMenuCentered}>
            <Text style={styles.headerSearchMenuTitle}>
              Rechercher : {searchModal.title}
            </Text>

            <TextInput
              value={searchModal.value}
              onChangeText={updateSearchModalValue}
              autoFocus
              placeholder="Contient..."
              style={styles.headerSearchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.headerSearchActions}>
              <Pressable
                onPress={clearActiveSearch}
                style={({ pressed }) => [
                  styles.headerSearchSecondaryBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.headerSearchSecondaryBtnText}>Effacer</Text>
              </Pressable>

              <Pressable
                onPress={closeColumnSearch}
                style={({ pressed }) => [
                  styles.headerSearchPrimaryBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
              >
                <Text style={styles.headerSearchPrimaryBtnText}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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

  checkboxHeader: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxHeaderGroup: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  checkboxHeaderBtn: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxHeaderBtnActive: {
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
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

  searchableHeader: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  searchableHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    flexShrink: 1,
  },

  headerSearchAnchor: {
    marginLeft: "auto",
  },
  headerSearchBtn: {
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
  headerSearchBtnActive: {
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
  },
  headerSearchBtnDim: {
    opacity: 0.7,
  },
  headerSearchDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1D4ED8",
  },

  headerSearchMenuCentered: {
    alignSelf: "center",
    marginTop: 120,
    width: 320,
    maxWidth: "92%",
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    gap: 10,
  },
  headerSearchMenuTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSearchInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  headerSearchActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  headerSearchSecondaryBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  headerSearchSecondaryBtnText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 12,
  },
  headerSearchPrimaryBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#1F536E",
    justifyContent: "center",
    alignItems: "center",
  },
  headerSearchPrimaryBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 12,
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

  btnPressed: {
    opacity: 0.8,
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
});
