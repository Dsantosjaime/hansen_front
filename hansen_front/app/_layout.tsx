import React from "react";
import { Stack } from "expo-router";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function RootLayout() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor },
        headerTintColor: textColor,
        headerTitleStyle: { fontWeight: "600" },
      }}
    />
  );
}
