// src/components/ui/TreeList.tsx
import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

export type TreeNode<T> = {
  id: string;
  label: string;
  data?: T;
  children?: TreeNode<T>[];
};

export type TreeListProps<T> = {
  nodes: TreeNode<T>[];
  renderLeaf: (node: TreeNode<T>, ctx: { level: number }) => React.ReactNode;
  renderHeader?: (node: TreeNode<T>, ctx: { level: number }) => React.ReactNode;
  isLeaf?: (node: TreeNode<T>) => boolean;
  scroll?: boolean;
  style?: ViewStyle;
  wrapLeafChildren?: boolean;
};

function TreeListInner<T>({
  nodes,
  renderLeaf,
  renderHeader,
  isLeaf,
  scroll = true,
  style,
  wrapLeafChildren = true,
}: TreeListProps<T>) {
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({ light: "#0F172A", dark: "#F9FAFB" }, "text");

  const isLeafNode = (n: TreeNode<T>) =>
    isLeaf ? isLeaf(n) : !n.children || n.children.length === 0;

  const renderDefaultHeader = (node: TreeNode<T>, level: number) => {
    const indent = level === 0 ? 0 : level * 20;

    return (
      <View style={[styles.headerRow, { marginLeft: indent }]}>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: backgroundSecond }]}>
            {node.label}
          </Text>
        </View>
        <View
          style={[
            styles.headerSeparator,
            { backgroundColor: backgroundSecond },
          ]}
        />
      </View>
    );
  };

  const allChildrenAreLeaves = (node: TreeNode<T>) => {
    if (!node.children || node.children.length === 0) return false;
    return node.children.every(isLeafNode);
  };

  const NodeView = ({ node, level }: { node: TreeNode<T>; level: number }) => {
    if (isLeafNode(node)) return <>{renderLeaf(node, { level })}</>;

    return (
      <View style={styles.nodeBlock}>
        {renderHeader
          ? renderHeader(node, { level })
          : renderDefaultHeader(node, level)}

        {node.children && node.children.length > 0 ? (
          wrapLeafChildren && allChildrenAreLeaves(node) ? (
            <View style={[styles.leavesWrap, { marginLeft: (level + 1) * 20 }]}>
              {node.children.map((child) => (
                <React.Fragment key={child.id}>
                  {renderLeaf(child, { level: level + 1 })}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              {node.children.map((child) => (
                <View key={child.id} style={{ marginTop: 10 }}>
                  <NodeView node={child} level={level + 1} />
                </View>
              ))}
            </View>
          )
        ) : (
          <Text style={{ color: text, opacity: 0.7 }}>Aucun élément</Text>
        )}
      </View>
    );
  };

  const content = (
    <View style={[styles.container, style]}>
      {nodes.map((n) => (
        <View key={n.id} style={{ marginBottom: 18 }}>
          <NodeView node={n} level={0} />
        </View>
      ))}
    </View>
  );

  if (!scroll) return content;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      {content}
    </ScrollView>
  );
}

/**
 * IMPORTANT:
 * On "re-caste" le résultat de memo pour conserver la signature générique.
 */
export const TreeList = memo(TreeListInner) as <T>(
  props: TreeListProps<T>
) => React.ReactElement;

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  container: { flex: 1, minHeight: 0 },
  nodeBlock: { flex: 1, minHeight: 0 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    marginRight: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  headerSeparator: { flex: 1, height: 3, borderRadius: 3 },

  leavesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
});
