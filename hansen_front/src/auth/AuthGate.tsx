import { useThemeColor } from "@/hooks/use-theme-color";
import { initAuth, selectAuthStatus } from "@/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    if (status === "idle") {
      dispatch(initAuth());
    }
  }, [dispatch, status]);

  if (status === "idle" || status === "initializing") {
    return (
      <View style={[styles.container, { backgroundColor: backgroundSecond }]}>
        <Text style={[styles.textBtn, { color: backgroundLight }]}>
          Initialisation de la session…
        </Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.container, { backgroundColor: backgroundSecond }]}>
        <Text style={[styles.textBtn, { color: backgroundLight }]}>
          Erreur d’authentification. Réessayez plus tard.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 35,
    fontWeight: "600",
    marginBottom: 20,
  },
  button: {
    borderRadius: 12,
    width: 200,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  textBtn: {
    fontWeight: "600",
  },
});
