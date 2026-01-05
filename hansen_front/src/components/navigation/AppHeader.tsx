import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";

import { useThemeColor } from "@/hooks/use-theme-color";
import { useAppSelector } from "@/store/hooks";
import { useLogoutMutation } from "@/services/authApi";
import { HeaderNavMenu } from "./HeaderNavMenu";

export const AppHeader = memo(function AppHeader(
  props: NativeStackHeaderProps
) {
  const insets = useSafeAreaInsets();

  const background = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");

  const userName = useAppSelector((s) => s.auth.user?.name);
  const [logout, { isLoading }] = useLogoutMutation();

  const onLogout = useCallback(() => {
    if (!isLoading) logout();
  }, [isLoading, logout]);

  const canGoBack = !!props.back;

  return (
    <View
      style={[
        styles.outer,
        {
          paddingTop: insets.top,
          backgroundColor: background,
          borderBottomColor: border,
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.left}>
          {canGoBack ? (
            <Pressable
              onPress={props.navigation.goBack}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Retour"
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color={text} />
            </Pressable>
          ) : null}

          <Text style={[styles.brand, { color: text }]} numberOfLines={1}>
            HansenMarine
          </Text>
        </View>

        <View style={styles.center}>
          <HeaderNavMenu />
        </View>

        <View style={styles.right}>
          {userName ? (
            <>
              <Text
                style={[styles.userName, { color: text }]}
                numberOfLines={1}
              >
                {userName}
              </Text>

              <Pressable
                onPress={onLogout}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Se déconnecter"
                style={({ pressed }) => [
                  styles.logoutBtn,
                  { opacity: pressed || isLoading ? 0.6 : 1 },
                ]}
              >
                <Ionicons name="log-out-outline" size={20} color={text} />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inner: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 140,
    flexShrink: 1,
  },
  backBtn: {
    marginRight: 6,
    paddingVertical: 6,
    paddingRight: 6,
  },
  brand: {
    fontSize: 18,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    marginHorizontal: 10,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "55%",
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
});
