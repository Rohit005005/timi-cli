import { createAuthClient } from "better-auth/react";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
export const authClient = createAuthClient({
  baseURL: process.env.SERVER_URL,
  plugins: [deviceAuthorizationClient()],
});
