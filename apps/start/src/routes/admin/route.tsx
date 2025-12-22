import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import AdminNavigation from "@/components/generic/AdminNavigation";
import { RootProvider } from "@/components/generic/Context";
import { NavigationTracker } from "@/components/generic/NavigationTracker";
import { Wrapper } from "@/components/generic/wrapper";
import { createServerFn } from "@tanstack/react-start";
import { getAccess } from "@/getAccess";
import { getOrganizations, type schema } from "@repo/database";
import { seo } from "@/seo";
const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { account } = await getAccess();
	return {
		account,
	};
});

export const getUserOrganizations = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			const organizations = await getOrganizations(data.account.id);
			return { account: data.account, organizations };
		} catch (error) {
			console.log("🚀 ~ error:", error);
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/login" });
		}
	});

export const Route = createFileRoute("/admin")({
	head: () => ({
		meta: seo({
			title: "Admin",
		}),
	}),
	beforeLoad: async () => {
		const { account } = await fetchAuth();
		return {
			account,
		};
	},
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		return await getUserOrganizations({
			data: {
				account: context.account,
			},
		});
	},
	component: AdminLayout,
});

function AdminLayout() {
	const { account, organizations } = Route.useLoaderData();
	return (
		<div className="flex h-dvh max-h-dvh flex-col bg-sidebar overflow-hidden">
			<RootProvider account={account} organizations={organizations}>
				<NavigationTracker />
				<AdminNavigation />
				<Wrapper>
					<div className="relative h-full max-h-full">
						<Outlet />
					</div>
				</Wrapper>
			</RootProvider>
		</div>
	);
}
