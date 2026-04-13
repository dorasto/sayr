import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db, type schema } from "@repo/database";
import { getAccess } from "@/getAccess";
import { and, eq, gt, or } from "drizzle-orm";
import AdminHomePage from "@/components/pages/admin/home";

export type PendingInviteWithOrg = schema.inviteType & {
	organization: schema.organizationType | null;
};

const fetchPendingInvites = createServerFn({ method: "GET" }).handler(async () => {
	const { account } = await getAccess();
	if (!account) return [];

	const invites = await db.query.invite.findMany({
		where: (invites) =>
			and(
				eq(invites.status, "pending"),
				gt(invites.expiresAt, new Date()),
				or(eq(invites.userId, account.id), eq(invites.email, account.email))
			),
		with: {
			organization: true,
		},
	});

	return invites as PendingInviteWithOrg[];
});

export const Route = createFileRoute("/(admin)/home/")({
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
		const pendingInvites = await fetchPendingInvites();
		return { pendingInvites };
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { pendingInvites } = Route.useLoaderData();
	return <AdminHomePage pendingInvites={pendingInvites} />;
}
