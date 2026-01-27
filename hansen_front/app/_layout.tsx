import React from "react";
import { Redirect, Stack, useSegments } from "expo-router";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { useAppSelector } from "@/store/hooks";
import { AppHeader } from "@/components/navigation/AppHeader";
import "@/constants/global.css";

function AuthGate({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.token);
  const segments = useSegments();
  const isOnAuthRoute = segments[0] === "auth";

  if (!token && !isOnAuthRoute) {
    return <Redirect href="/auth" />;
  }

  if (token && isOnAuthRoute) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
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
