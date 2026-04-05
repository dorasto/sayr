import { createFileRoute, redirect } from "@tanstack/react-router";
import UserConnections from "@/components/pages/admin/settings/connections";
import { SubWrapper } from "@/components/generic/wrapper";
import { auth as authSchema, db, type schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import {
  getUserInfoDiscord,
  getUserInfoDoras,
  getUserInfoGithub,
  getUserInfoSlack,
} from "@/lib/fetches/connections";
import { seo } from "@/seo";
import { auth } from "@repo/auth";
import { getRequestHeaders } from "@tanstack/react-start/server";

async function resolveAccessToken(providerId: string, accountRow: any, headers: any) {
  if (!accountRow) return null;

  try {
    const res = await auth.api.getAccessToken({
      body: {
        providerId,
        accountId: accountRow.id,
      },
      headers,
    });

    return res?.accessToken || accountRow.accessToken || null;
  } catch (err) {
    console.error(`Failed to refresh token for ${providerId}:`, err);
    return accountRow.accessToken || null;
  }
}

export const getConnections = createServerFn({ method: "GET" })
  .inputValidator((data: { account: schema.userType }) => data)
  .handler(async ({ data }) => {
    try {
      const headers = getRequestHeaders();
      const h = new Headers(headers);
      const email = await db.query.account.findFirst({
        where: and(
          eq(authSchema.account.userId, data.account?.id),
          eq(authSchema.account.providerId, "credential"),
        ),
      });
      const [github, doras, discord, slack] = await Promise.all([
        db.query.account.findFirst({
          where: and(
            eq(authSchema.account.userId, data.account?.id),
            eq(authSchema.account.providerId, "github")
          ),
        }),
        db.query.account.findFirst({
          where: and(
            eq(authSchema.account.userId, data.account?.id),
            eq(authSchema.account.providerId, "doras")
          ),
        }),
        db.query.account.findFirst({
          where: and(
            eq(authSchema.account.userId, data.account?.id),
            eq(authSchema.account.providerId, "discord")
          ),
        }),
        db.query.account.findFirst({
          where: and(
            eq(authSchema.account.userId, data.account?.id),
            eq(authSchema.account.providerId, "slack")
          ),
        }),
      ]);

      // Resolve valid tokens for each provider
      const githubToken = await resolveAccessToken("github", github, h);
      // const dorasToken = await resolveAccessToken("doras", doras, h);
      const discordToken = await resolveAccessToken("discord", discord, h);
      const slackToken = await resolveAccessToken("slack", slack, h);
      const [githubUser, dorasUser, discordUser, slackUser] = await Promise.all([
        githubToken ? getUserInfoGithub(githubToken).catch(() => null) : null,
        doras?.accessToken ? getUserInfoDoras(doras?.accessToken || "").catch(() => null) : null,
        discordToken ? getUserInfoDiscord(discordToken).catch(() => null) : null,
        slackToken ? getUserInfoSlack(slackToken).catch(() => null) : null,
      ]);
      return {
        email,
        githubUser,
        dorasUser,
        discordUser,
        slackUser,
        providers: {
          github: !!(
            process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
          ),
          doras: !!(
            process.env.DORAS_CLIENT_ID && process.env.DORAS_CLIENT_SECRET
          ),
          discord: !!(
            process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
          ),
          slack: !!(
            process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET
          ),
        },
      };
    } catch (error) {
      console.error(error)
      if (error && typeof error === "object" && "redirect" in error) {
        throw error;
      }
      throw redirect({ to: "/" });
    }
  });

export const Route = createFileRoute("/(admin)/settings/connections/")({
  head: () => ({ meta: seo({ title: "Connections · Settings" }) }),
  loader: async ({ context }) => {
    if (!context.account) {
      throw redirect({ to: "/auth/login" });
    }
    return await getConnections({ data: { account: context.account } });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { email, githubUser, dorasUser, discordUser, slackUser, providers } =
    Route.useLoaderData();
  return (
    <SubWrapper
      title="Connections"
      style="compact"
      description="Connect accounts to sign in with and power integrations"
    >
      <UserConnections
        email={email}
        githubUser={githubUser}
        dorasUser={dorasUser}
        discordUser={discordUser}
        slackUser={slackUser}
        providers={providers}
      />
    </SubWrapper>
  );
}
