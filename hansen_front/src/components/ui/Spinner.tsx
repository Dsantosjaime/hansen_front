import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  size?: "small" | "large";
  fullHeight?: boolean; // centre verticalement si true
};

export function Spinner({ size = "large", fullHeight = false }: Props) {
  const color = useThemeColor({ light: "#1F536E", dark: "#FFFFFF" }, "text");

  return (
    <View style={[styles.root, fullHeight && styles.fullHeight]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullHeight: {
    flex: 1,
  },
});
