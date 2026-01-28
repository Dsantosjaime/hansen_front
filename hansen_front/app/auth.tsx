import { useThemeColor } from "@/hooks/use-theme-color";
import { login, selectAuthStatus } from "@/slices/authSlice";
import { Redirect } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppDispatch, useAppSelector } from "../src/store/hooks";

export default function AuthScreen() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const backgroundLight = useThemeColor({}, "backgroundLight");

  if (status === "authenticated") {
    return <Redirect href="/hansen" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: backgroundSecond }]}>
      <Text style={[styles.title, { color: backgroundLight }]}>Connexion</Text>

      <Pressable
        onPress={() => dispatch(login())}
        style={[styles.button, { backgroundColor: backgroundLight }]}
        disabled={status === "initializing"}
      >
        <Text style={[styles.textBtn, { color: backgroundSecond }]}>
          Se connecter
        </Text>
      </Pressable>
    </View>
  );
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
