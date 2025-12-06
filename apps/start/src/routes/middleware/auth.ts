import { auth } from "@repo/auth";
import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) {
		throw redirect({ to: "/home" });
	}

	return await next();
});
