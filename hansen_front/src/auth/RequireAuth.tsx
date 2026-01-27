import { selectAuthStatus } from "@/slices/authSlice";
import { Redirect } from "expo-router";
import React from "react";
import { useAppSelector } from "../store/hooks";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAppSelector(selectAuthStatus);

  if (status === "unauthenticated") {
    return <Redirect href="/auth" />;
  }

  return <>{children}</>;
}
