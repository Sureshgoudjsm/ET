export const ENV = {
  appId: process.env.VITE_APP_ID || "local-dev-app-id",
  cookieSecret: process.env.JWT_SECRET || "local-dev-secret-key-1234567890-must-be-long-enough",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
