import { Spinner } from "@/components/ui/Spinner";
import { TreeList, type TreeNode } from "@/components/ui/TreeList";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useGetEmailInfoQuery, type EmailSend } from "@/services/emailApi";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = {
  emailId: string;
  onClose: () => void;
};

type LeafData =
  | {
      kind: "subGroup";
      group: NonNullable<EmailSend["affected"]>[number];
      subGroup: NonNullable<EmailSend["affected"]>[number]["subGroups"][number];
    }
  | {
      kind: "empty";
      group: NonNullable<EmailSend["affected"]>[number];
      subGroup: null;
    };

function formatDateFR(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // Version robuste (sans Intl)
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

export function EmailInfos({ emailId, onClose }: Props) {
  const background = useThemeColor({}, "backgroundDark");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  const { data: email, isLoading } = useGetEmailInfoQuery({ id: emailId });

  const nodes = useMemo<TreeNode<LeafData>[]>(() => {
    if (!email) return [];

    const affected = email.affected ?? [];

    return affected.map((g) => {
      const subs = g.subGroups ?? [];

      return {
        id: `group:${g.groupId}`,
        label: g.groupName,
        children:
          subs.length > 0
            ? subs.map((sg) => ({
                id: `sub:${g.groupId}:${sg.subGroupId}`,
                label: sg.subGroupName,
                data: { kind: "subGroup", group: g, subGroup: sg },
              }))
            : [
                {
                  id: `empty:${g.groupId}`,
                  label: "Aucun sous-groupe",
                  data: { kind: "empty", group: g, subGroup: null },
                },
              ],
      };
    });
  }, [email]);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: background, borderColor: border },
      ]}
    >
      <View style={[styles.topRow, { backgroundColor: backgroundSecond }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerText, { color: text }]} numberOfLines={1}>
            {formatDateFR(email?.createdAt)}
          </Text>

          <Text style={[styles.headerText, { color: text }]} numberOfLines={1}>
            {email?.subject ?? ""}
          </Text>

          <Text style={[styles.headerText, { color: text }]} numberOfLines={1}>
            {email?.status ?? ""}
          </Text>
        </View>

        <View style={styles.headerRight}>
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

      <View style={styles.content}>
        {isLoading ? (
          <Spinner fullHeight />
        ) : !email ? (
          <View style={styles.center}>
            <Text style={[styles.helperText, { color: muted }]}>
              Campagne introuvable.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.treeScrollContent}
          >
            <TreeList<LeafData>
              scroll={false}
              nodes={nodes}
              renderHeader={(node, { level }) => {
                if (level !== 0) return null;

                return (
                  <View style={styles.groupHeaderRow}>
                    <View style={styles.groupHeaderTitleWrap}>
                      <Text
                        style={[
                          styles.groupHeaderTitle,
                          { color: backgroundSecond },
                        ]}
                      >
                        {node.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.groupHeaderSeparator,
                        { backgroundColor: backgroundSecond },
                      ]}
                    />
                  </View>
                );
              }}
              renderLeaf={(node) => {
                // Sécurité (au cas où)
                if (!node.data) return null;

                if (node.data.kind === "empty") {
                  return (
                    <View
                      key={node.id}
                      style={[
                        styles.subGroupChip,
                        { borderColor: backgroundSecond, opacity: 0.6 },
                      ]}
                    >
                      <View
                        style={[
                          styles.bullet,
                          { backgroundColor: backgroundSecond },
                        ]}
                      />
                      <Text
                        style={[
                          styles.subGroupText,
                          { color: backgroundSecond },
                        ]}
                        numberOfLines={1}
                      >
                        Aucun sous-groupe
                      </Text>
                    </View>
                  );
                }

                return (
                  <View
                    key={node.id}
                    style={[
                      styles.subGroupChip,
                      { borderColor: backgroundSecond },
                    ]}
                  >
                    <View
                      style={[
                        styles.bullet,
                        { backgroundColor: backgroundSecond },
                      ]}
                    />
                    <Text
                      style={[styles.subGroupText, { color: backgroundSecond }]}
                      numberOfLines={1}
                    >
                      {node.label}
                    </Text>
                  </View>
                );
              }}
            />
          </ScrollView>
        )}
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
  topRow: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "900",
    maxWidth: 340,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    minHeight: 0,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  helperText: {
    fontWeight: "700",
  },
  treeScrollContent: {
    paddingBottom: 12,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
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
    marginTop: 10,
    marginLeft: 40,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 6,
    marginRight: 10,
  },
  subGroupText: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
});
