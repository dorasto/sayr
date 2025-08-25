import { genericOAuthClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react" // make sure to import from better-auth/react
import type { auth } from "./index";
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(),genericOAuthClient()
],
});

export const signInDoras = async () => {
    await authClient.signIn.oauth2({providerId:"doras"})
}