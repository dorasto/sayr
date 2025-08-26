import { auth } from "@repo/auth";
import { headers } from "next/headers";
import { redirectAuth } from "@/app/lib/redirectAuth";

export async function getAccess() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (session) {
		return session;
	}
	return redirectAuth();
}
