import { Platform } from "react-native";

export function getWebOrigin(): string {
  if (Platform.OS !== "web") return "";
  return window.location.origin;
}

export function getWebRedirectUri(pathname: string): string {
  const origin = getWebOrigin();
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${normalized}`;
}
