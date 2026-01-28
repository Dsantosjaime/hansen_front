import { TreeList, type TreeNode } from "@/components/ui/TreeList";
import { useThemeColor } from "@/hooks/use-theme-color";
import type {
  Permission,
  PermissionGroup,
  PermissionSubGroup,
} from "@/types/permissionGroup";
import type { UserRulesGroup } from "@/types/userRulesGroup";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type Props = {
  group: UserRulesGroup;
  permissionsDomains: PermissionGroup[];
  modifyUserRulesGroup: (nextGroup: UserRulesGroup) => void | Promise<void>;
};

type CheckedMap = Record<string, boolean>;

/**
 * Tu as indiqué que (subject, action) est unique => on peut s'en servir comme clé.
 */
function permKey(subject: string, action: string) {
  return `${subject}::${action}`;
}

type PermissionLeafData = {
  domain: PermissionGroup;
  subDomain: PermissionSubGroup;
  permission: Permission;
};

export default function ModifyUserRulesGroup({
  group,
  permissionsDomains,
  modifyUserRulesGroup,
}: Props) {
  const backgroundSecond = useThemeColor({}, "backgroundSecond");

  /**
   * Important: si modifyUserRulesGroup est async et que le parent met à jour group
   * avec un délai, on évite les "stale props" en cumulant sur une ref.
   */
  const groupRef = useRef<UserRulesGroup>(group);
  useEffect(() => {
    groupRef.current = group;
  }, [group]);

  // 1) Adapter -> Tree nodes
  const nodes = useMemo<TreeNode<PermissionLeafData>[]>(() => {
    return permissionsDomains.map((domain) => ({
      id: `domain:${domain.id}`,
      label: domain.name,
      children: domain.permissionSubGroup.map((subGroup) => ({
        id: `sub:${domain.id}:${subGroup.name}`,
        label: subGroup.name,
        children: subGroup.permissions.map((p) => {
          // node.id doit être unique dans l'arbre; on inclut le contexte + la clé permission
          const key = permKey(p.subject, p.action);
          return {
            id: `perm:${domain.id}:${subGroup.name}:${key}`,
            label: p.action,
            data: { domain, subDomain: subGroup, permission: p },
          };
        }),
      })),
    }));
  }, [permissionsDomains]);

  // 2) checked map initial depuis group.permissions
  const initialCheckedMap = useMemo<CheckedMap>(() => {
    const checked: CheckedMap = {};

    for (const domain of permissionsDomains) {
      for (const subDomain of domain.permissionSubGroup) {
        for (const permission of subDomain.permissions) {
          const key = permKey(permission.subject, permission.action);
          checked[key] = hasPermissionInGroup(
            group,
            permission.subject,
            permission.action
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
      const key = permKey(leaf.permission.subject, leaf.permission.action);

      // Calculer nextChecked depuis l'état le plus à jour
      let nextChecked = false;
      setCheckedByKey((prev) => {
        const currentlyChecked = !!prev[key];
        nextChecked = !currentlyChecked;
        return { ...prev, [key]: nextChecked };
      });

      const baseGroup = groupRef.current;

      const nextGroup = applyPermissionToggleToGroup(
        baseGroup,
        leaf.permission,
        nextChecked
      );

      // Important: cumuler localement pour éviter l’écrasement entre clics
      groupRef.current = nextGroup;

      await modifyUserRulesGroup(nextGroup);
    },
    [modifyUserRulesGroup]
  );

  return (
    <View style={styles.container}>
      <TreeList<PermissionLeafData>
        nodes={nodes}
        renderHeader={(node, { level }) => {
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
          const key = permKey(leaf.permission.subject, leaf.permission.action);
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
                {translateActionToFrench(leaf.permission.action)}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function translateActionToFrench(action: string) {
  const a = action.trim().toLowerCase();

  const map: Record<string, string> = {
    create: "Créer",
    read: "Lire",
    update: "Modifier",
    delete: "Supprimer",
    copy: "Copier",
  };

  return map[a] ?? action;
}

function hasPermissionInGroup(
  group: UserRulesGroup,
  subject: string,
  action: string
): boolean {
  return !!group.permissions?.some(
    (p) => p.subject === subject && p.action === action
  );
}

function applyPermissionToggleToGroup(
  group: UserRulesGroup,
  permission: Permission,
  checked: boolean
): UserRulesGroup {
  const current = group.permissions ?? [];
  const exists = current.some(
    (p) => p.subject === permission.subject && p.action === permission.action
  );

  let nextPermissions = current;

  if (checked && !exists) {
    nextPermissions = [
      ...current,
      { subject: permission.subject, action: permission.action },
    ];
  } else if (!checked && exists) {
    nextPermissions = current.filter(
      (p) =>
        !(p.subject === permission.subject && p.action === permission.action)
    );
  }

  return {
    ...group,
    permissions: nextPermissions,
  };
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
