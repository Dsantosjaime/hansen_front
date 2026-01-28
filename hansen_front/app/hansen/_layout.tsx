import { RequireAuth } from "@/auth/RequireAuth";
import { AppHeader } from "@/components/navigation/AppHeader";
import { Stack } from "expo-router";
import React from "react";

export default function ProtectedLayout() {
  return (
    <RequireAuth>
      <Stack
        screenOptions={{
          header: (props) => <AppHeader {...props} />,
        }}
      />
    </RequireAuth>
  );
}
