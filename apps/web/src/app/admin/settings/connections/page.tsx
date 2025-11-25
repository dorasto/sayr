/** biome-ignore-all lint/suspicious/noExplicitAny: <will fix later> */
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
	location: any;
	email: any;
	hireable: any;
	bio: string;
	twitter_username: string;
	notification_email: any;
	public_repos: number;
	public_gists: number;
	followers: number;
	following: number;
	created_at: string;
	updated_at: string;
};

export default async function Mine() {
	const { account } = await getAccess();

	// Find GitHub account association for this user
	const github = await db.query.account.findFirst({
		where: and(eq(auth.account.userId, account?.id), eq(auth.account.providerId, "github")),
	});

	async function getUserInfo(accessToken: string): Promise<GithubUserType> {
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

	let githubUser: GithubUserType | null = null;

	if (github?.accessToken) {
		githubUser = await getUserInfo(github.accessToken);
	}

	// Pass the `githubUser` data to your component
	return (
		<SubWrapper title="Connections" style="compact">
			<UserConnections githubUser={githubUser} />
		</SubWrapper>
	);
}
