import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  Contact,
  useGetContactsByGroupQuery,
  useGetGroupsQuery,
  useGetSubGroupsByGroupQuery,
} from "@/services/contactsApi";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/select.types";
import { DataGrid, GridColumnDef } from "@/components/grid/Grid";

export default function ContactsScreen() {
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");

  const { data: groups = [], isLoading: groupsLoading } = useGetGroupsQuery();

  // IMPORTANT: groupId dépend d'un fetch async => démarre à null
  const [groupId, setGroupId] = useState<number | null>(null);
  const [subGroupId, setSubGroupId] = useState<number | null>(null);

  // Quand les groupes arrivent, sélectionne le 1er groupe (si non défini ou invalide)
  useEffect(() => {
    if (!groups.length) return;

    const currentIsValid =
      groupId !== null && groups.some((g) => g.id === groupId);
    if (!currentIsValid) {
      setGroupId(groups[0].id);
      setSubGroupId(null);
    }
  }, [groups, groupId]);

  const groupOptions = useMemo<SelectOption<number>[]>(
    () => groups.map((g) => ({ value: g.id, label: g.name })),
    [groups]
  );

  // Ne requête sous-groupes + contacts que quand groupId est connu
  const { data: subGroups = [] } = useGetSubGroupsByGroupQuery(
    groupId ? { groupId } : (undefined as any)
  );

  const { data: contacts = [] } = useGetContactsByGroupQuery(
    groupId ? { groupId } : (undefined as any)
  );

  const subGroupOptions = useMemo<SelectOption<number>[]>(
    () => subGroups.map((sg) => ({ value: sg.id, label: sg.name })),
    [subGroups]
  );

  const filteredContacts = useMemo(() => {
    if (!subGroupId) return contacts;
    return contacts.filter((c) => c.subGroup.id === subGroupId);
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
      { accessorKey: "status", header: "Statut", meta: { editable: true } },
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
    ],
    []
  );

  return (
    <View style={[styles.screen, { backgroundColor: backgroundLight }]}>
      <View style={styles.toolbar}>
        <Select<number>
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

        <Select<number>
          label="Sous-Groupe"
          value={subGroupId}
          options={subGroupOptions}
          onChange={(id) => setSubGroupId(id)}
          searchable
          searchPlaceholder="Rechercher un sous-groupe..."
          disabled={!groupId || subGroupOptions.length === 0}
        />
      </View>

      <View style={styles.content}>
        <View style={[styles.gridPlaceholder, { borderColor: border }]}>
          <DataGrid
            data={filteredContacts}
            columns={columns}
            pageSize={10}
            onCellUpdate={({ rowIndex, columnId, value }) => {
              // [PLACEHOLDER] patch côté store/RTK Query plus tard
              console.log("cell update", { rowIndex, columnId, value });
            }}
            onLineClick={(rowIndex) => {}}
          />
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
  info: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  gridPlaceholder: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.85,
    textAlign: "center",
  },
});
