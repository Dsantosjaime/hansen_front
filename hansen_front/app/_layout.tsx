import { AuthGate } from "@/auth/AuthGate";
import { bindKeycloakEvents } from "@/auth/bindKeycloakEvents";
import "@/constants/global.css";
import { store } from "@/store/store";
import { Slot } from "expo-router";
import React, { useMemo } from "react";
import { Provider } from "react-redux";

export default function RootLayout() {
  useMemo(() => {
    bindKeycloakEvents(store);
    return null;
  }, []);

  return (
    <Provider store={store}>
      <AuthGate>
        <Slot />
      </AuthGate>
    </Provider>
  );
}
