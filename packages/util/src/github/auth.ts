import { Octokit } from "@octokit/rest";
import jwt from "jsonwebtoken";

// biome-ignore lint/style/noNonNullAssertion: <needed>
const APP_ID = process.env.GITHUB_APP_ID!;
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n") || "";
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

export async function getInstallationDetailsWithRepos(github: {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	organizationId: string | null;
	installationId: number;
	user:
		| {
				id: string;
				name: string;
				email: string;
				emailVerified: boolean;
				image: string | null;
				createdAt: Date;
				updatedAt: Date;
				role: string | null;
				banned: boolean | null;
				banReason: string | null;
				banExpires: Date | null;
		  }
		| undefined
		| null;
}) {
	// App‑level auth to fetch metadata
	const appOctokit = new Octokit({ auth: createAppJWT() });
	// biome-ignore lint/suspicious/noExplicitAny: <will fix later>
	const { data: install }: any = await appOctokit.request("GET /app/installations/{installation_id}", {
		installation_id: github.installationId,
		headers: { "X-GitHub-Api-Version": "2022-11-28" },
	});

	// Installation‑level auth to fetch repositories
	const token = await getInstallationToken(github.installationId);
	const instOctokit = new Octokit({ auth: token });

	// biome-ignore lint/suspicious/noExplicitAny: <will fix later>
	const allRepos: any[] = [];
	let page = 1;

	while (true) {
		const { data } = await instOctokit.rest.apps.listReposAccessibleToInstallation({
			per_page: 100,
			page,
		});
		allRepos.push(...data.repositories);
		if (data.repositories.length < 100) break;
		page++;
	}

	return {
		installationId: install.id,
		installDate: install.created_at,
		joinUserName: github.user?.name || null,
		account: {
			login: install.account?.login ?? null,
			id: install.account?.id ?? null,
			type: install.account?.type ?? null,
			avatar_url: install.account?.avatar_url ?? null,
			html_url:
				install.account?.html_url ??
				(install.account?.login ? `https://github.com/${install.account.login}` : null),
		},
		target_type: install.target_type,
		app_id: install.app_id,
		permissions: install.permissions,
		repositories: allRepos.map((r) => ({
			id: r.id,
			name: r.name,
			full_name: r.full_name,
			owner: r.owner.login,
			private: r.private,
		})),
		createdAt: github.createdAt,
		updatedAt: github.updatedAt,
	};
}
