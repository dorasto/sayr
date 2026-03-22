import type { DiscordUserType, DorasUserType, GithubUserType } from "@/types";

export async function getUserInfoGithub(accessToken: string): Promise<GithubUserType> {
	const response = await fetch("https://api.github.com/user", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/vnd.github+json",
			"User-Agent": "ProjectManagementTool",
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data;
}

export async function getUserInfoDoras(accessToken: string): Promise<DorasUserType> {
	const response = await fetch("https://doras.to/api/v1/account/me", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`Doras API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data;
}

export async function getUserInfoDiscord(accessToken: string): Promise<DiscordUserType> {
	const response = await fetch("https://discord.com/api/users/@me", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data;
}
