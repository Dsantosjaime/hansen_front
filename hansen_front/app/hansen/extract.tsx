import Ionicons from "@expo/vector-icons/build/Ionicons";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/select.types";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useExtractContactsMutation } from "@/services/extractApi";
import { useGetGroupsQuery } from "@/services/groupsApi";

import {
  SelectGroupsSubGroups,
  type GroupsAndSubGroupSelected,
} from "@/components/extract/SelectGroupsSubGroups";
import { exportExtractToExcel } from "@/services/extractExport";

export default function ExtractScreen() {
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const backgroundDark = useThemeColor({}, "backgroundDark");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({}, "text");
  const textDark = useThemeColor({}, "textDark");
  const border = useThemeColor({ dark: "#1F2937" }, "text");
  const muted = useThemeColor({ dark: "#9CA3AF" }, "text");

  const { data: groups = [], isFetching } = useGetGroupsQuery();

  const [extractContacts, { isLoading: isExtracting, error: extractError }] =
    useExtractContactsMutation();

  const ALL = "__ALL__";
  const [filterGroupId, setFilterGroupId] = useState<string>(ALL);

  const filterOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: ALL, label: "Tous" },
      ...groups.map((g) => ({ value: g.id, label: g.name })),
    ],
    [groups]
  );

  const [selected, setSelected] = useState<GroupsAndSubGroupSelected>([]);
  const hasSelection = useMemo(() => selected.length > 0, [selected]);

  const extractData = useCallback(
    async (payload: GroupsAndSubGroupSelected) => {
      try {
        // Appel serveur ici
        const result = await extractContacts(payload).unwrap();

        await exportExtractToExcel(result, { fileName: "hansen_extract.xlsx" });

        // Optionnel: reset de la sélection
        setSelected([]);
      } catch (e) {
        console.log("Extract error:", e);
      }
    },
    [extractContacts]
  );

  return (
    <View style={[styles.container, { backgroundColor: backgroundLight }]}>
      <View style={styles.pageHeader}>
        <View style={styles.filterWrap}>
          <Select<string>
            label="Filtrer"
            value={filterGroupId}
            options={filterOptions}
            onChange={setFilterGroupId}
            searchable
            searchPlaceholder="Rechercher un groupe..."
            disabled={isFetching || filterOptions.length === 0}
          />
        </View>

        <View>
          <Text style={[styles.extractBtnText, { color: textDark }]}>
            {`Groupe(s) concernés: ${selected.length}`}
          </Text>
          <Text style={[styles.extractBtnText, { color: textDark }]}>
            {`Sous-Groupe(s) concernés: ${selected.reduce(
              (sum, e) => sum + (e.subGroups?.length ?? 0),
              0
            )}`}
          </Text>
        </View>

        <Pressable
          onPress={() => extractData(selected)}
          disabled={!hasSelection || isExtracting}
          style={({ pressed }) => [
            styles.extractBtn,
            { backgroundColor: backgroundSecond, borderColor: border },
            pressed && hasSelection && !isExtracting && styles.pressed,
            (!hasSelection || isExtracting) && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Extraire"
        >
          <Ionicons name="download-outline" size={20} color={text} />
          <Text style={[styles.extractBtnText, { color: text }]}>
            {isExtracting ? "Extraction..." : "Extraire"}
          </Text>
        </Pressable>
      </View>

      {!!extractError && (
        <Text style={{ color: muted, marginBottom: 8, fontWeight: "700" }}>
          Une erreur est survenue pendant l’extraction.
        </Text>
      )}

      <View
        style={[
          styles.card,
          { backgroundColor: backgroundDark, borderColor: border },
        ]}
      >
        {isFetching ? (
          <View style={styles.center}>
            <Text style={[styles.loadingText, { color: muted }]}>
              Chargement…
            </Text>
          </View>
        ) : (
          <SelectGroupsSubGroups
            groups={groups}
            filterGroupId={filterGroupId === ALL ? null : filterGroupId}
            value={selected}
            onChange={setSelected}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  filterWrap: { flex: 1 },
  extractBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  extractBtnText: { fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  card: {
    flex: 1,
    minHeight: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontWeight: "700" },
});
