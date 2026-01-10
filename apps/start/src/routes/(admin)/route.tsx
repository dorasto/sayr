import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import AdminNavigation from "@/components/generic/AdminNavigation";
import { RootProvider } from "@/components/generic/Context";
import { NavigationTracker } from "@/components/generic/NavigationTracker";
import { Wrapper } from "@/components/generic/wrapper";
import { getAccess } from "@/getAccess";
import { getOrganizations, type schema } from "@repo/database";
import { seo } from "@/seo";

// --- SERVER FUNCTIONS ---

// Base authentication fetcher
const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { account, sessionId } = await getAccess();
	return { account, sessionId };
});

// Fetch organizations for the authenticated user
export const getUserOrganizations = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			const organizations = await getOrganizations(data.account.id);
			return { account: data.account, organizations };
		} catch (error) {
			console.error("🚨 Error fetching organizations:", error);
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/login" });
		}
	});

// --- CLIENT-SIDE AUTH CACHE ---

const AUTH_CACHE_TTL = 30000; // 30 seconds

// Only define client-side caches (avoid SSR sharing)
const authCacheMap =
	typeof window !== "undefined" ? new Map<string, { account: schema.userType | null; timestamp: number }>() : null;

const authInFlightMap =
	typeof window !== "undefined"
		? new Map<string, Promise<{ account: schema.userType | null; sessionId?: string }>>()
		: null;

/**
 * Session-aware cached auth fetcher.
 * - Uses sessionId for isolation
 * - Deduplicates concurrent requests
 * - Disabled during SSR to prevent user leaks
 */
async function getCachedAuth(): Promise<{
	account: schema.userType | null;
	sessionId?: string;
}> {
	// On the server, always get fresh data
	if (typeof window === "undefined") return fetchAuth();

	const initial = await fetchAuth();
	const sessionId = initial.sessionId || initial.account?.id || "anonymous";

	const now = Date.now();
	// biome-ignore lint/style/noNonNullAssertion: <dont care>
	const cache = authCacheMap!;
	// biome-ignore lint/style/noNonNullAssertion: <dont care>
	const inFlight = authInFlightMap!;
	const cached = cache.get(sessionId);

	// Return cached result if still valid
	if (cached && now - cached.timestamp < AUTH_CACHE_TTL) {
		return { account: cached.account, sessionId };
	}

	// Deduplicate concurrent requests
	const existingInFlight = inFlight.get(sessionId);
	if (existingInFlight) return existingInFlight;

	// Fetch fresh data and update cache
	const newReq = fetchAuth()
		.then((result) => {
			if (result.account) {
				cache.set(sessionId, {
					account: result.account,
					timestamp: Date.now(),
				})
			} else {
				cache.delete(sessionId);
			}
			return result;
		})
		.finally(() => {
			inFlight.delete(sessionId);
		})

	inFlight.set(sessionId, newReq);
	return newReq;
}

// --- ROUTE CONFIGURATION ---

export const Route = createFileRoute("/(admin)")({
	head: () => ({
		meta: seo({ title: "Admin" }),
	}),

	beforeLoad: async () => {
		const { account } = await getCachedAuth();
		return { account };
	},

	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}

		return await getUserOrganizations({
			data: { account: context.account },
		})
	},
	component: AdminLayout,
});

// --- COMPONENT ---

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
	)
}
