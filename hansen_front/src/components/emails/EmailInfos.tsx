import React, { useMemo } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Spinner } from "@/components/ui/Spinner";
import { TreeList, type TreeNode } from "@/components/ui/TreeList";
import { useGetEmailQuery } from "@/services/emailsApi";
import { Email } from "@/types/email";
import Ionicons from "@expo/vector-icons/build/Ionicons";

type Props = {
  emailId: string;
  onClose: () => void; // ✅ ajouté
};

type LeafData = {
  group: Email["groups"][number];
  subGroup: Email["groups"][number]["subGroups"][number];
};

function formatDateFR(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function EmailInfos({ emailId, onClose }: Props) {
  const background = useThemeColor({}, "backgroundDark");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  const { data: email, isLoading } = useGetEmailQuery({ idEmail: emailId });

  const nodes = useMemo<TreeNode<LeafData>[]>(() => {
    if (!email) return [];
    return (email.groups ?? []).map((g) => ({
      id: `group:${g.id}`,
      label: g.name,
      children: (g.subGroups ?? []).map((sg) => ({
        id: `sub:${g.id}:${sg.id}`,
        label: sg.name,
        data: { group: g, subGroup: sg },
      })),
    }));
  }, [email]);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: background, borderColor: border },
      ]}
    >
      <View style={[styles.topRow, { backgroundColor: backgroundSecond }]}>
        {/* ✅ Infos alignées à gauche */}
        <View style={styles.headerLeft}>
          <Text style={[styles.headerText, { color: text }]} numberOfLines={1}>
            {formatDateFR(email?.sendingDate)}
          </Text>
          <Text style={[styles.headerText, { color: text }]} numberOfLines={1}>
            {email?.subject ?? ""}
          </Text>
          <Text style={[styles.headerText, { color: text }]} numberOfLines={1}>
            {email?.sender?.name ?? ""}
          </Text>
        </View>

        {/* ✅ Croix à droite */}
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
              Email introuvable.
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
              renderLeaf={(node) => (
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
              )}
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
