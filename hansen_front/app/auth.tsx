import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, Stack } from "expo-router";

import { useThemeColor } from "@/hooks/use-theme-color";
import { useLoginMutation } from "@/services/authApi";

export default function Auth() {
  const background = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");

  const inputBg = useThemeColor(
    { light: "#F3F4F6", dark: "#111827" },
    "background"
  );
  const inputBorder = useThemeColor(
    { light: "#E5E7EB", dark: "#1F2937" },
    "text"
  );
  const primary = useThemeColor({ light: "#2563EB", dark: "#60A5FA" }, "text");
  const danger = useThemeColor({ light: "#DC2626", dark: "#F87171" }, "text");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [localError, setLocalError] = useState<string | null>(null);
  const [login, { isLoading, error }] = useLoginMutation();

  const apiErrorMessage = useMemo(() => {
    if (!error) return null;
    return "Connexion impossible. Vérifie tes identifiants.";
  }, [error]);

  const onSubmit = async () => {
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError("Veuillez renseigner votre login et votre mot de passe.");
      return;
    }

    try {
      await login({ email: email.trim(), password }).unwrap();
    } catch {
      // message affiché via apiErrorMessage
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: background }]}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.card}>
          <Text style={[styles.title, { color: text }]}>Connexion</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: text }]}>Login</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="email@domaine.com"
              placeholderTextColor={
                Platform.OS === "ios" ? "#9CA3AF" : "#6B7280"
              }
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: text,
                },
              ]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: text }]}>Mot de passe</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="********"
              placeholderTextColor={
                Platform.OS === "ios" ? "#9CA3AF" : "#6B7280"
              }
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: text,
                },
              ]}
            />
          </View>

          <View style={styles.actionsRow}>
            <Link href="/auth/forgot-password" asChild>
              <Pressable hitSlop={10}>
                <Text style={[styles.link, { color: primary }]}>
                  Mot de passe oublié ?
                </Text>
              </Pressable>
            </Link>
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.button,
              {
                opacity: pressed || isLoading ? 0.7 : 1,
                backgroundColor: primary,
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </Pressable>

          {/* Zone d'erreurs (réservée sous le formulaire) */}
          <View style={styles.errorArea}>
            {localError || apiErrorMessage ? (
              <Text style={[styles.errorText, { color: danger }]}>
                {localError ?? apiErrorMessage}
              </Text>
            ) : (
              <Text style={styles.errorPlaceholder}>
                {/* espace réservé */}
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    alignSelf: "center",
    maxWidth: 420,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  link: {
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  errorArea: {
    minHeight: 24, // réserve l'espace même sans erreur
    marginTop: 6,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorPlaceholder: {
    fontSize: 13,
    opacity: 0,
  },
});
