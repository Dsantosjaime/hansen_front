import Keycloak from "keycloak-js";

export const keycloak = new Keycloak({
  url: process.env.KEYCLOAK_URL ?? "", // ex: "https://sso.example.com"
  realm: process.env.KEYCLOAK_REALM ?? "", // ex: "my-realm"
  clientId: process.env.KEYCLOAK_CLIENT_ID ?? "", // ex: "my-spa"
});
