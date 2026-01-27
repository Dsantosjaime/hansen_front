import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/build/Ionicons";

import { useThemeColor } from "@/hooks/use-theme-color";
import { Spinner } from "@/components/ui/Spinner";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/select.types";

import { useGetGroupsQuery } from "@/services/contactsApi";
import {
  SelectGroupsSubGroups,
  type GroupsAndSubGroupSelected,
} from "@/components/extract/SelectGroupsSubGroups";

type Props = {
  onClose: () => void;
  handleSend: (payload: {
    templateId: string;
    groups: GroupsAndSubGroupSelected;
  }) => void | Promise<void>;
};

export function NewEmail({ onClose, handleSend }: Props) {
  const background = useThemeColor({}, "backgroundDark");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({}, "text");
  const textDark = useThemeColor({}, "textDark");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  // Groups
  const { data: groups = [], isFetching } = useGetGroupsQuery();

  // Template select (placeholder pour l’instant)
  const templateOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "tpl-1", label: "Template 1" },
      { value: "tpl-2", label: "Template 2" },
    ],
    []
  );
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Group selection
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

  const canSend = useMemo(
    () => !!templateId && selected.length > 0,
    [templateId, selected]
  );

  const onSend = useCallback(async () => {
    if (!templateId) return;
    if (selected.length === 0) return;

    await handleSend({ templateId, groups: selected });
    // reset après envoi (optionnel)
    setSelected([]);
    setTemplateId(null);
  }, [handleSend, selected, templateId]);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: background, borderColor: border },
      ]}
    >
      {/* Header (même design que EmailInfos) */}
      <View style={[styles.topRow, { backgroundColor: backgroundSecond }]}>
        {/* Gauche: Select Template (unique champ demandé) */}
        <View style={styles.headerLeft}>
          <View style={styles.templateSelectWrap}>
            <Select<string>
              label="Template"
              value={templateId}
              options={templateOptions}
              onChange={setTemplateId}
              searchable
              searchPlaceholder="Choisir un template..."
            />
          </View>
        </View>

        {/* Droite: envoyer + close */}
        <View style={styles.headerRight}>
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: !canSend ? 0.45 : pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Envoyer"
          >
            <Ionicons name="send-outline" size={22} color={text} />
          </Pressable>

          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Content (TreeList avec checkbox via SelectGroupsSubGroups) */}
      <View style={styles.content}>
        {/* Petit filtre optionnel au-dessus de l’arbre (ne prend pas la place du header) */}
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
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

          <View style={styles.counters}>
            <Text style={[styles.counterText, { color: textDark }]}>
              {`Groupe(s): ${selected.length}`}
            </Text>
            <Text style={[styles.counterText, { color: textDark }]}>
              {`Sous-Groupe(s): ${selected.reduce(
                (sum, e) => sum + (e.subGroups?.length ?? 0),
                0
              )}`}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { borderColor: border }]}>
          {isFetching ? (
            <View style={styles.center}>
              <Spinner />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },

  // Header
  topRow: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  templateSelectWrap: {
    maxWidth: 520,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 12,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Content
  content: {
    flex: 1,
    minHeight: 0,
    padding: 16,
    gap: 12,
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  counters: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    minWidth: 160,
  },
  counterText: {
    fontSize: 13,
    fontWeight: "800",
  },

  card: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { fontWeight: "700" },
});
