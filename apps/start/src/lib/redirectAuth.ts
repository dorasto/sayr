import { redirect } from "@tanstack/react-router";

// Helper you can call from a beforeLoad/loader where you have the Request
export function redirectAuth(): never {
	// Send users to the public home without hitting the admin rewrite.
	throw redirect({ href: "http://localhost:3001" });
}
