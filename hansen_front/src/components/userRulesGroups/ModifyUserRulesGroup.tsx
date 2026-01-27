import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import Ionicons from "@expo/vector-icons/build/Ionicons";

import { TreeList, type TreeNode } from "@/components/ui/TreeList";
import { Permission } from "@/services/permissionDomainsApi";
import {
  PermissionsDomain,
  PermissionSubDomain,
} from "@/types/permissionsDomain";
import { UserRulesGroup } from "@/types/userRulesGroup";

export type Props = {
  group: UserRulesGroup;
  permissionsDomains: PermissionsDomain[];
  modifyUserRulesGroup: (nextGroup: UserRulesGroup) => void | Promise<void>;
};

type CheckedMap = Record<string, boolean>;

function permKey(domainId: string, subDomainId: string, permissionId: string) {
  return `${domainId}::${subDomainId}::${permissionId}`;
}

type PermissionLeafData = {
  domain: PermissionsDomain;
  subDomain: PermissionsDomain["subDomain"][number];
  permission: PermissionsDomain["subDomain"][number]["permissions"][number];
};

export default function ModifyUserRulesGroup({
  group,
  permissionsDomains,
  modifyUserRulesGroup,
}: Props) {
  const backgroundSecond = useThemeColor({}, "backgroundSecond");

  // 1) Adapter -> Tree nodes
  const nodes = useMemo<TreeNode<PermissionLeafData>[]>(() => {
    return permissionsDomains.map((domain) => ({
      id: `domain:${domain.id}`,
      label: domain.name,
      children: domain.subDomain.map((sd) => ({
        id: `sub:${domain.id}:${sd.id}`,
        label: sd.name,
        children: sd.permissions.map((p) => ({
          id: permKey(domain.id, sd.id, p.id), // clé unique "checkbox"
          label: p.name,
          data: { domain, subDomain: sd, permission: p },
        })),
      })),
    }));
  }, [permissionsDomains]);

  // 2) checked map initial depuis group (clé = permKey)
  const initialCheckedMap = useMemo<CheckedMap>(() => {
    const checked: CheckedMap = {};

    for (const domain of permissionsDomains) {
      for (const subDomain of domain.subDomain) {
        for (const permission of subDomain.permissions) {
          const key = permKey(domain.id, subDomain.id, permission.id);
          checked[key] = hasPermissionInGroup(
            group,
            domain.id,
            subDomain.id,
            permission.id
          );
        }
      }
    }
    return checked;
  }, [group, permissionsDomains]);

  const [checkedByKey, setCheckedByKey] =
    useState<CheckedMap>(initialCheckedMap);

  useEffect(() => {
    setCheckedByKey(initialCheckedMap);
  }, [initialCheckedMap]);

  const togglePermission = useCallback(
    async (leaf: PermissionLeafData) => {
      const key = permKey(
        leaf.domain.id,
        leaf.subDomain.id,
        leaf.permission.id
      );
      const currentlyChecked = !!checkedByKey[key];
      const nextChecked = !currentlyChecked;

      setCheckedByKey((prev) => ({ ...prev, [key]: nextChecked }));

      const nextGroup = applyPermissionToggleToGroup(
        group,
        leaf.domain,
        leaf.subDomain,
        leaf.permission,
        nextChecked
      );

      await modifyUserRulesGroup(nextGroup);
    },
    [checkedByKey, group, modifyUserRulesGroup]
  );

  return (
    <View style={styles.container}>
      <TreeList<PermissionLeafData>
        nodes={nodes}
        renderHeader={(node, { level }) => {
          // Domain header
          if (level === 0) {
            return (
              <View style={styles.domainHeaderRow}>
                <View style={styles.domainHeaderTitleWrap}>
                  <Text
                    style={[
                      styles.domainHeaderTitle,
                      { color: backgroundSecond },
                    ]}
                  >
                    {node.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.domainHeaderSeparator,
                    { backgroundColor: backgroundSecond },
                  ]}
                />
              </View>
            );
          }

          // SubDomain header
          if (level === 1) {
            return (
              <View style={styles.subDomainHeaderRow}>
                <Text
                  style={[
                    styles.subDomainHeaderTitle,
                    { color: backgroundSecond },
                  ]}
                >
                  {node.label}
                </Text>
              </View>
            );
          }

          // fallback (si un jour tu as plus de niveaux non-feuilles)
          return (
            <View style={{ marginLeft: level * 20 }}>
              <Text style={{ color: backgroundSecond, fontWeight: "700" }}>
                {node.label}
              </Text>
            </View>
          );
        }}
        renderLeaf={(node) => {
          const leaf = node.data!;
          const key = permKey(
            leaf.domain.id,
            leaf.subDomain.id,
            leaf.permission.id
          );
          const checked = !!checkedByKey[key];

          return (
            <Pressable
              key={node.id}
              onPress={() => togglePermission(leaf)}
              style={({ pressed }) => [
                styles.permissionChip,
                { borderColor: backgroundSecond },
                checked && { backgroundColor: "rgba(31,83,110,0.10)" },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: backgroundSecond },
                  checked && { backgroundColor: backgroundSecond },
                ]}
              >
                {checked ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>

              <Text
                style={[styles.permissionText, { color: backgroundSecond }]}
                numberOfLines={1}
              >
                {leaf.permission.name}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function hasPermissionInGroup(
  group: UserRulesGroup,
  domainId: string,
  subDomainId: string,
  permissionId: string
): boolean {
  const d = group.domains.find((x) => x.id === domainId);
  const sd = d?.subDomain.find(
    (x: PermissionSubDomain) => x.id === subDomainId
  );
  return !!sd?.permissions.some((p: Permission) => p.id === permissionId);
}

function applyPermissionToggleToGroup(
  group: UserRulesGroup,
  domain: PermissionsDomain,
  subDomain: PermissionsDomain["subDomain"][number],
  permission: PermissionsDomain["subDomain"][number]["permissions"][number],
  checked: boolean
): UserRulesGroup {
  const currentDomains = group.domains ?? [];

  const domainIdx = currentDomains.findIndex((d) => d.id === domain.id);
  const existingDomain: PermissionsDomain =
    domainIdx >= 0
      ? currentDomains[domainIdx]
      : { id: domain.id, name: domain.name, subDomain: [] };

  const currentSubDomains = existingDomain.subDomain ?? [];
  const subIdx = currentSubDomains.findIndex((sd) => sd.id === subDomain.id);
  const existingSub =
    subIdx >= 0
      ? currentSubDomains[subIdx]
      : { id: subDomain.id, name: subDomain.name, permissions: [] };

  const currentPerms = existingSub.permissions ?? [];
  const permExists = currentPerms.some((p) => p.id === permission.id);

  let nextPerms = currentPerms;
  if (checked && !permExists) {
    nextPerms = [...currentPerms, { id: permission.id, name: permission.name }];
  } else if (!checked && permExists) {
    nextPerms = currentPerms.filter((p) => p.id !== permission.id);
  }

  const nextSub = { ...existingSub, permissions: nextPerms };
  const nextSubDomains =
    subIdx >= 0
      ? currentSubDomains.map((sd, i) => (i === subIdx ? nextSub : sd))
      : [...currentSubDomains, nextSub];

  const nextDomain: PermissionsDomain = {
    ...existingDomain,
    subDomain: nextSubDomains,
  };
  const nextDomains =
    domainIdx >= 0
      ? currentDomains.map((d, i) => (i === domainIdx ? nextDomain : d))
      : [...currentDomains, nextDomain];

  return { ...group, domains: nextDomains };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },

  permissionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderRadius: 10,
    maxWidth: "100%",
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
  permissionText: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  domainHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  domainHeaderTitleWrap: {
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    marginRight: 20,
  },
  domainHeaderTitle: {
    fontSize: 25,
    fontWeight: "800",
  },
  domainHeaderSeparator: {
    flex: 1,
    height: 3,
    borderRadius: 3,
  },
  subDomainHeaderRow: {
    marginLeft: 30,
    marginTop: 10,
  },
  subDomainHeaderTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
});
