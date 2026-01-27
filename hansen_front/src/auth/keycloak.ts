import Keycloak from "keycloak-js";

export const keycloak = new Keycloak({
  url: process.env.EXPO_PUBLIC_KEYCLOAK_URL ?? "", // ex: "https://sso.example.com"
  realm: process.env.EXPO_PUBLIC_KEYCLOAK_REALM ?? "", // ex: "my-realm"
  clientId: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID ?? "", // ex: "my-spa"
});
