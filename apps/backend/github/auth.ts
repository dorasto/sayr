import { Octokit } from "@octokit/rest";
import jwt from "jsonwebtoken";

// biome-ignore lint/style/noNonNullAssertion: <needed>
const APP_ID = process.env.GITHUB_APP_ID!;
// biome-ignore lint/style/noNonNullAssertion: <needed>
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY!;
export function createAppJWT(): string {
	const now = Math.floor(Date.now() / 1000);
	return jwt.sign({ iat: now - 60, exp: now + 600, iss: APP_ID }, PRIVATE_KEY, { algorithm: "RS256" });
}

export async function getInstallationToken(installationId: number): Promise<string> {
	const appOctokit = new Octokit({ auth: createAppJWT() });
	const res = await appOctokit.request("POST /app/installations/{installation_id}/access_tokens", {
		installation_id: installationId,
	});
	return res.data.token;
}
