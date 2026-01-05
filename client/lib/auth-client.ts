import { createAuthClient } from "better-auth/react";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
export const authClient = createAuthClient({
  baseURL: "http://localhost:8000",
  plugins: [deviceAuthorizationClient()],
});
