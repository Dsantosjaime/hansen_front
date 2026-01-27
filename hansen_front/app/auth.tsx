import { login, selectAuthStatus } from "@/slices/authSlice";
import { Redirect } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useAppDispatch, useAppSelector } from "../src/store/hooks";

export default function AuthScreen() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  if (status === "authenticated") {
    return <Redirect href="/" />;
  }

  return (
    <View style={{ padding: 16, maxWidth: 520 }}>
      <Text style={{ fontSize: 24, fontWeight: "600", marginBottom: 8 }}>
        Connexion
      </Text>

      <Text style={{ marginBottom: 12 }}>
        Vous serez redirigé vers Keycloak. En cas d’oubli, utilisez “Mot de
        passe oublié” sur la page Keycloak.
      </Text>

      <Pressable
        onPress={() => dispatch(login())}
        style={{
          backgroundColor: "#111827",
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 6,
          alignSelf: "flex-start",
          opacity: status === "initializing" ? 0.5 : 1,
        }}
        disabled={status === "initializing"}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Se connecter</Text>
      </Pressable>
    </View>
  );
}
