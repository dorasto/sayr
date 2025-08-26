import { headers } from "next/headers";
import { redirect } from "next/navigation";
export async function redirectAuth() {
	try {
		const headersList = await headers();
		const pathname = headersList.get("x-pathname");
		if (pathname) {
			return redirect("/");
		} else {
			return redirect("/");
		}
	} catch (_) {
		return redirect("/");
	}
}
