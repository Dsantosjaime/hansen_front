import Ionicons from "@expo/vector-icons/build/Ionicons";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TreeList, type TreeNode } from "@/components/ui/TreeList";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Group, SubGroup } from "@/services/groupsApi";

export type GroupsAndSubGroupSelected = {
  id: string;
  name: string;
  subGroups: { id: string; name: string }[];
}[];

type LeafData = { group: Group; subGroup: SubGroup };

export type SelectGroupsSubGroupsProps = {
  groups: Group[];

  /** filtre (id du groupe à afficher) ; null => tous */
  filterGroupId: string | null;

  /** objet sélectionné (contrôlé) */
  value: GroupsAndSubGroupSelected;

  /** callback de modification de sélection */
  onChange: (next: GroupsAndSubGroupSelected) => void;
};

const leafKey = (groupId: string, subGroupId: string) =>
  `${groupId}::${subGroupId}`;

export function SelectGroupsSubGroups({
  groups,
  filterGroupId,
  value,
  onChange,
}: SelectGroupsSubGroupsProps) {
  const accent = useThemeColor({}, "backgroundSecond");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");

  const displayedGroups = useMemo(() => {
    if (filterGroupId == null) return groups;
    return groups.filter((g) => g.id === filterGroupId);
  }, [groups, filterGroupId]);

  // lookup rapide des sous-groupes cochés (clé composite)
  const selectedKeyMap = useMemo(() => {
    const map: Record<string, true> = {};
    for (const g of value) {
      for (const sg of g.subGroups) {
        map[leafKey(g.id, sg.id)] = true;
      }
    }
    return map;
  }, [value]);

  const isSubGroupChecked = useCallback(
    (groupId: string, subGroupId: string) =>
      !!selectedKeyMap[leafKey(groupId, subGroupId)],
    [selectedKeyMap]
  );

  const getGroupCheckState = useCallback(
    (group: Group) => {
      const subs = group.subGroups ?? [];
      if (subs.length === 0) return { all: false, some: false };

      let count = 0;
      for (const sg of subs) if (isSubGroupChecked(group.id, sg.id)) count++;

      return {
        all: count === subs.length,
        some: count > 0 && count < subs.length,
      };
    },
    [isSubGroupChecked]
  );

  const toggleSubGroup = useCallback(
    (group: Group, subGroup: SubGroup) => {
      const currentlyChecked = isSubGroupChecked(group.id, subGroup.id);
      const next = [...value];

      const gIdx = next.findIndex((x) => x.id === group.id);
      const gEntry =
        gIdx >= 0
          ? next[gIdx]
          : { id: group.id, name: group.name, subGroups: [] };

      const exists = gEntry.subGroups.some((x) => x.id === subGroup.id);

      let nextSubGroups = gEntry.subGroups;
      if (!currentlyChecked && !exists) {
        nextSubGroups = [
          ...gEntry.subGroups,
          { id: subGroup.id, name: subGroup.name },
        ];
      } else if (currentlyChecked && exists) {
        nextSubGroups = gEntry.subGroups.filter((x) => x.id !== subGroup.id);
      }

      if (nextSubGroups.length === 0) {
        if (gIdx >= 0) next.splice(gIdx, 1);
        onChange(next);
        return;
      }

      const nextGroupEntry = { ...gEntry, subGroups: nextSubGroups };
      if (gIdx >= 0) next[gIdx] = nextGroupEntry;
      else next.push(nextGroupEntry);

      onChange(next);
    },
    [isSubGroupChecked, onChange, value]
  );

  const toggleAllSubGroupsOfGroup = useCallback(
    (group: Group) => {
      const { all } = getGroupCheckState(group);
      const next = [...value];

      const gIdx = next.findIndex((x) => x.id === group.id);

      if (all) {
        // décocher tout le groupe
        if (gIdx >= 0) next.splice(gIdx, 1);
        onChange(next);
        return;
      }

      // cocher tous les sous-groupes
      const allSubGroups = (group.subGroups ?? []).map((sg) => ({
        id: sg.id,
        name: sg.name,
      }));

      const nextGroupEntry = {
        id: group.id,
        name: group.name,
        subGroups: allSubGroups,
      };
      if (gIdx >= 0) next[gIdx] = nextGroupEntry;
      else next.push(nextGroupEntry);

      onChange(next);
    },
    [getGroupCheckState, onChange, value]
  );

  const nodes = useMemo<TreeNode<LeafData>[]>(() => {
    return displayedGroups.map((g) => ({
      id: `group:${g.id}`,
      label: g.name,
      children: (g.subGroups ?? []).map((sg) => ({
        id: leafKey(g.id, sg.id), // unique même si sg.id dupliqué dans d'autres groupes
        label: sg.name,
        data: { group: g, subGroup: sg },
      })),
    }));
  }, [displayedGroups]);

  return (
    <View style={styles.root}>
      <TreeList<LeafData>
        nodes={nodes}
        renderHeader={(node, { level }) => {
          if (level !== 0) return null;

          const groupId = String(node.id).replace("group:", "");
          const group = groups.find((g) => g.id === groupId);
          if (!group) return null;

          const { all, some } = getGroupCheckState(group);

          return (
            <Pressable
              onPress={() => toggleAllSubGroupsOfGroup(group)}
              style={styles.groupHeaderRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: all }}
            >
              <View
                style={[
                  styles.groupHeaderCheckbox,
                  { borderColor: accent },
                  all && { backgroundColor: accent },
                ]}
              >
                {all ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : some ? (
                  <Ionicons name="remove" size={14} color={accent} />
                ) : null}
              </View>

              <View style={styles.groupHeaderTitleWrap}>
                <Text style={[styles.groupHeaderTitle, { color: accent }]}>
                  {group.name}
                </Text>
              </View>

              <View
                style={[
                  styles.groupHeaderSeparator,
                  { backgroundColor: accent },
                ]}
              />
            </Pressable>
          );
        }}
        renderLeaf={(node) => {
          const data = node.data!;
          const checked = isSubGroupChecked(data.group.id, data.subGroup.id);

          return (
            <Pressable
              key={node.id}
              onPress={() => toggleSubGroup(data.group, data.subGroup)}
              style={({ pressed }) => [
                styles.subGroupChip,
                { borderColor: accent },
                checked && styles.subGroupChipChecked,
                pressed && styles.pressed,
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: accent },
                  checked && { backgroundColor: accent },
                ]}
              >
                {checked ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>

              <Text
                style={[styles.subGroupText, { color: accent }]}
                numberOfLines={1}
              >
                {data.subGroup.name}
              </Text>
            </Pressable>
          );
        }}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderWidth: 0, borderColor: border },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  pressed: {
    opacity: 0.8,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  groupHeaderCheckbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  groupHeaderTitleWrap: {
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    marginRight: 20,
  },
  groupHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  groupHeaderSeparator: {
    flex: 1,
    height: 3,
    borderRadius: 3,
  },
  subGroupChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderRadius: 10,
    maxWidth: "100%",
  },
  subGroupChipChecked: {
    backgroundColor: "rgba(31,83,110,0.10)",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  subGroupText: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
});
