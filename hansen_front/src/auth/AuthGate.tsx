// src/auth/AuthGate.tsx
import { initAuth, selectAuthStatus } from "@/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import React, { useEffect } from "react";
import { View } from "react-native";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    // Init une seule fois
    console.log("OKKKKK", process.env.EXPO_PUBLIC_KEYCLOAK_URL);
    if (status === "idle") {
      dispatch(initAuth());
    }
  }, [dispatch, status]);

  if (status === "idle" || status === "initializing") {
    return <View>Initialisation de la session…</View>;
  }

  if (status === "error") {
    return <View>Erreur d’authentification. Réessayez plus tard.</View>;
  }

  return <>{children}</>;
}
