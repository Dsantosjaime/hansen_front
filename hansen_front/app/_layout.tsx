import { AuthGate } from "@/auth/AuthGate";
import { bindKeycloakEvents } from "@/auth/bindKeycloakEvents";
import { AppHeader } from "@/components/navigation/AppHeader";
import "@/constants/global.css";
import { store } from "@/store/store";
import { Stack } from "expo-router";
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
        <Stack
          screenOptions={{
            header: (props) => <AppHeader {...props} />,
          }}
        />
      </AuthGate>
    </Provider>
  );
}
