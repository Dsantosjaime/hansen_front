import { ContactInfos } from "@/components/grid/ContactInfos";
import { Grid, GridColumnDef } from "@/components/grid/Grid";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/select.types";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  Contact,
  Status,
  useGetContactsByGroupQuery,
  useUpdateContactMutation,
} from "@/services/contactsApi";
import { useGetGroupsQuery } from "@/services/groupsApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PanelState =
  | { type: "create" }
  | { type: "edit"; contactId: string }
  | null;

export default function ContactsScreen() {
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");

  const { data: groups = [], isLoading: groupsLoading } = useGetGroupsQuery();
  const [updateContact] = useUpdateContactMutation();

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

  const formatDateFR = (value: unknown) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  };

  const openContactInfos = (contact: Contact) => {
    setPanel({ type: "edit", contactId: contact.id });
  };

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
        meta: {
          editable: true,
          editor: "select",
          selectOptions: [
            { value: Status.ACTIF, label: Status.ACTIF },
            { value: Status.INACTIF, label: Status.INACTIF },
          ],
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
        meta: { width: 56 },
        cell: ({ row }) => (
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
              marginLeft: "auto",
            })}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir la fiche contact"
          >
            <Ionicons name="open-outline" size={18} color="#1F536E" />
          </Pressable>
        ),
      },
    ],
    []
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
});
