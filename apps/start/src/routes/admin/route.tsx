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

// Client-side auth cache to prevent redundant server calls during rapid interactions
let authCache: { account: schema.userType | null; timestamp: number } | null = null;
let authInFlight: Promise<{ account: schema.userType | null }> | null = null;
const AUTH_CACHE_TTL = 30000; // 30 seconds

/**
 * Cached wrapper around fetchAuth to prevent redundant server calls.
 * This prevents auth failures during rapid UI interactions where
 * TanStack Router might re-run beforeLoad multiple times.
 *
 * Features:
 * - Returns cached result if still valid (30s TTL)
 * - Deduplicates concurrent requests (only one in-flight request at a time)
 * - Only caches successful auth results
 */
async function getCachedAuth(): Promise<{ account: schema.userType | null }> {
	const now = Date.now();

	// Return cached result if still valid
	if (authCache && (now - authCache.timestamp) < AUTH_CACHE_TTL) {
		return { account: authCache.account };
	}

	// If there's already a request in flight, wait for it instead of making a new one
	if (authInFlight) {
		return authInFlight;
	}

	// Fetch fresh auth with deduplication
	authInFlight = fetchAuth().then((result) => {
		// Only cache successful auth (account exists)
		// Don't cache null results to allow retry on next navigation
		if (result.account) {
			authCache = { account: result.account, timestamp: Date.now() };
		}
		return result;
	}).finally(() => {
		authInFlight = null;
	});

	return authInFlight;
}

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
		const { account } = await getCachedAuth();
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
	// Prevent revalidation when only search params change in child routes
	shouldRevalidate: () => false,
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
