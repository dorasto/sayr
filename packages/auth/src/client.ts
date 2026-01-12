import {
  genericOAuthClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import type { auth } from "./index";
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), genericOAuthClient()],
});

export const signInDoras = async () => {
  const found = await authClient.getSession();
  if (found.data) {
    window.location.href = "/";
    return;
  }

  await authClient.signIn.oauth2({
    providerId: "doras",
    //@ts-expect-error not typed not sure why
    redirectURL: `${window.location.origin}`,
  });
};

export const singInGithub = async () => {
  const found = await authClient.getSession();
  if (found.data) {
    window.location.href = "/";
    return;
  }
  await authClient.signIn.social({
    provider: "github",
    //@ts-expect-error not typed not sure why
    redirectURL: `${window.location.origin}`,
  });
};
