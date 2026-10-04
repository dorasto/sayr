import { auth } from "@repo/auth";
import { auth as authSchema, db, type schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { getUserInfoDiscord, getUserInfoDoras, getUserInfoGithub, getUserInfoSlack } from "@/lib/fetches/connections";

// The personal settings sections' data (components/settings/sections). Every function reads the signed-in user from
// the request's session, never from its input, so the admin settings pages and the portal's account dialog (on any
// org subdomain, where the session cookie is shared) can call them the same way.

async function requireSessionUser(headers: Headers) {
	const session = await auth.api.getSession({ headers });
	if (!session?.user) throw new Error("Not signed in");
	return session.user;
}

function findAccount(userId: string, issuer: string) {
	return db.query.account.findFirst({
		where: and(eq(authSchema.account.userId, userId), eq(authSchema.account.issuer, issuer)),
	});
}

/** A provider's access token, refreshed through Better Auth when it can be, else the stored one. */
async function resolveAccessToken(accountRow: schema.accountType | undefined, headers: Headers) {
	if (!accountRow) return null;
	try {
		const res = await auth.api.getAccessToken({ body: { accountId: accountRow.id }, headers });
		return res?.accessToken || accountRow.accessToken || null;
	} catch (err) {
		console.error(`Failed to refresh token for ${accountRow.providerId}:`, err);
		return accountRow.accessToken || null;
	}
}

/** Security section: whether the user has a password (2FA needs one), 2FA state and the current backup codes. */
export const getSecuritySettings = createServerFn({ method: "GET" }).handler(async () => {
	const headers = new Headers(getRequestHeaders());
	const user = await requireSessionUser(headers);
	const [credential, userRow] = await Promise.all([
		db.query.account.findFirst({
			where: and(eq(authSchema.account.userId, user.id), eq(authSchema.account.providerId, "credential")),
		}),
		db.query.user.findFirst({ where: eq(authSchema.user.id, user.id), columns: { twoFactorEnabled: true } }),
	]);
	const twoFactorEnabled = userRow?.twoFactorEnabled ?? false;
	let backupCodes: string[] = [];
	if (twoFactorEnabled) {
		try {
			const result = await auth.api.viewBackupCodes({ body: { userId: user.id } });
			backupCodes = result.backupCodes || [];
		} catch {
			backupCodes = [];
		}
	}
	return { hasPassword: !!credential, twoFactorEnabled, backupCodes };
});

/** Connections section: the user's email login and linked OAuth accounts, plus which providers are configured. */
export const getConnectionSettings = createServerFn({ method: "GET" }).handler(async () => {
	const headers = new Headers(getRequestHeaders());
	const user = await requireSessionUser(headers);
	const [email, github, doras, discord, slack] = await Promise.all([
		findAccount(user.id, "local:credential"),
		findAccount(user.id, "local:oauth:github"),
		findAccount(user.id, "local:oauth:doras"),
		findAccount(user.id, "local:oauth:discord"),
		findAccount(user.id, "local:oauth:slack"),
	]);
	const [githubToken, discordToken, slackToken] = await Promise.all([
		resolveAccessToken(github, headers),
		resolveAccessToken(discord, headers),
		resolveAccessToken(slack, headers),
	]);
	const [githubUser, dorasUser, discordUser, slackUser] = await Promise.all([
		githubToken ? getUserInfoGithub(githubToken).catch(() => null) : null,
		doras?.accessToken ? getUserInfoDoras(doras.accessToken).catch(() => null) : null,
		discordToken ? getUserInfoDiscord(discordToken).catch(() => null) : null,
		slackToken ? getUserInfoSlack(slackToken).catch(() => null) : null,
	]);
	return {
		accountEmail: user.email,
		email: email ?? null,
		githubUser: githubUser && github ? { ...githubUser, account_id: github.id } : null,
		dorasUser,
		discordUser: discordUser && discord ? { ...discordUser, account_id: discord.id } : null,
		slackUser: slackUser && slack ? { ...slackUser, account_id: slack.id } : null,
		providers: {
			github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
			doras: !!(process.env.DORAS_CLIENT_ID && process.env.DORAS_CLIENT_SECRET),
			discord: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
			slack: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
		},
	};
});

const OAUTH_PROVIDERS = ["doras", "github", "discord", "slack"] as const;
export type ReauthProvider = (typeof OAUTH_PROVIDERS)[number];

function isProviderConfigured(provider: ReauthProvider) {
	const key = provider.toUpperCase();
	return !!(process.env[`${key}_CLIENT_ID`] && process.env[`${key}_CLIENT_SECRET`]);
}

/**
 * The re-auth page's options: the ways this user can sign in again (their linked providers that are still configured,
 * and a password if they have one). `null` when nobody is signed in.
 */
export const getReauthOptions = createServerFn({ method: "GET" }).handler(async () => {
	const headers = new Headers(getRequestHeaders());
	const session = await auth.api.getSession({ headers });
	if (!session?.user) return null;
	const accounts = await db.query.account.findMany({
		where: eq(authSchema.account.userId, session.user.id),
		columns: { providerId: true },
	});
	const linked = new Set(accounts.map((account) => account.providerId));
	return {
		email: session.user.email,
		hasPassword: linked.has("credential"),
		providers: OAUTH_PROVIDERS.filter((provider) => linked.has(provider) && isProviderConfigured(provider)),
	};
});
