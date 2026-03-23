import { createFileRoute, redirect } from "@tanstack/react-router";
import UserConnections from "@/components/pages/admin/settings/connections";
import { SubWrapper } from "@/components/generic/wrapper";
import { auth, db, type schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import {
  getUserInfoDiscord,
  getUserInfoDoras,
  getUserInfoGithub,
  getUserInfoSlack,
} from "@/lib/fetches/connections";
import type {
  DiscordUserType,
  DorasUserType,
  GithubUserType,
  SlackUserType,
} from "@/types";
import { seo } from "@/seo";

export const getConnections = createServerFn({ method: "GET" })
  .inputValidator((data: { account: schema.userType }) => data)
  .handler(async ({ data }) => {
    try {
      const email = await db.query.account.findFirst({
        where: and(
          eq(auth.account.userId, data.account?.id),
          eq(auth.account.providerId, "credential"),
        ),
      });
      const github = await db.query.account.findFirst({
        where: and(
          eq(auth.account.userId, data.account?.id),
          eq(auth.account.providerId, "github"),
        ),
      });
      const doras = await db.query.account.findFirst({
        where: and(
          eq(auth.account.userId, data.account?.id),
          eq(auth.account.providerId, "doras"),
        ),
      });
      const discord = await db.query.account.findFirst({
        where: and(
          eq(auth.account.userId, data.account?.id),
          eq(auth.account.providerId, "discord"),
        ),
      });
      const slack = await db.query.account.findFirst({
        where: and(
          eq(auth.account.userId, data.account?.id),
          eq(auth.account.providerId, "slack"),
        ),
      });

      let githubUser: GithubUserType | null = null;
      let dorasUser: DorasUserType | null = null;
      let discordUser: DiscordUserType | null = null;
      let slackUser: SlackUserType | null = null;

      if (github?.accessToken) {
        try {
          githubUser = await getUserInfoGithub(github.accessToken);
        } catch (error) {
          console.error("Failed to fetch GitHub user:", error);
        }
      }

      if (doras?.accessToken) {
        try {
          dorasUser = await getUserInfoDoras(doras.accessToken);
        } catch (error) {
          console.error("Failed to fetch Doras user:", error);
        }
      }

      if (discord?.accessToken) {
        try {
          discordUser = await getUserInfoDiscord(discord.accessToken);
        } catch (error) {
          console.error("Failed to fetch Discord user:", error);
        }
      }

      if (slack?.accessToken) {
        try {
          slackUser = await getUserInfoSlack(slack.accessToken);
        } catch (error) {
          console.error("Failed to fetch Slack user:", error);
        }
      }

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
