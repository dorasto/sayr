import { auth, db } from "@repo/database";
import { and, eq } from "drizzle-orm";
import UserConnections from "@/app/components/admin/settings/connections";
import { SubWrapper } from "@/app/components/layout/wrapper";
import { getAccess } from "@/app/lib/serverFunctions";

export type GithubUserType = {
	login: string;
	id: number;
	node_id: string;
	avatar_url: string;
	gravatar_id: string;
	url: string;
	html_url: string;
	followers_url: string;
	following_url: string;
	gists_url: string;
	starred_url: string;
	subscriptions_url: string;
	organizations_url: string;
	repos_url: string;
	events_url: string;
	received_events_url: string;
	type: string;
	user_view_type: string;
	site_admin: boolean;
	name: string;
	company: string;
	blog: string;
	location: string | null;
	email: string | null;
	hireable: boolean | null;
	bio: string;
	twitter_username: string;
	notification_email: string | null | undefined;
	public_repos: number;
	public_gists: number;
	followers: number;
	following: number;
	created_at: string;
	updated_at: string;
};

export type DorasUserType = {
	email: string;
	id: string;
	created_at: string;
	updated_at: string;
	username: string;
	displayname: string;
	pic: string;
	bio: string;
	account_type: string;
	is_brand: boolean;
	design: {
		profile_pic_shape: string;
	};
	domain: {
		domain: string;
		verfied: boolean;
	};
	settings: {
		branding: boolean;
		location: string;
		pronouns: string;
	};
};

export default async function Mine() {
	const { account } = await getAccess();

	// Find GitHub account association for this user
	const github = await db.query.account.findFirst({
		where: and(eq(auth.account.userId, account?.id), eq(auth.account.providerId, "github")),
	});
	const doras = await db.query.account.findFirst({
		where: and(eq(auth.account.userId, account?.id), eq(auth.account.providerId, "doras")),
	});

	async function getUserInfoGithub(accessToken: string): Promise<GithubUserType> {
		const response = await fetch("https://api.github.com/user", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/vnd.github+json",
			},
		});

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		return data;
	}
	async function getUserInfoDoras(accessToken: string): Promise<DorasUserType> {
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
	let githubUser: GithubUserType | null = null;
	let dorasUser: DorasUserType | null = null;
	if (github?.accessToken) {
		githubUser = await getUserInfoGithub(github.accessToken);
	}
	if (doras?.accessToken) {
		dorasUser = await getUserInfoDoras(doras.accessToken);
	}

	return (
		<SubWrapper title="Connections" style="compact">
			<UserConnections githubUser={githubUser} dorasUser={dorasUser} />
		</SubWrapper>
	);
}
