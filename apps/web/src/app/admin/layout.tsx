import { getOrganizations } from "@repo/database";
import type { Metadata } from "next";
import type React from "react";
import AdminNavigation from "../components/layout/admin/admin-navigation";
import { Wrapper } from "../components/layout/wrapper";
import { getAccess } from "../lib/serverFunctions";
import { RootProvider } from "./Context";

export const metadata: Metadata = {
	title: "Admin",
	description: "A starter template for Next.js, Tailwind CSS, and Turborepo",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
	icons: {
		icon: "/favicon.ico",
		shortcut: "/favicon-16x16.png",
		apple: "/apple-touch-icon.png",
	},
};

export default async function RootLayoutRoot({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { account } = await getAccess();
	const organizations = await getOrganizations(account.id);
	return (
		<div className="flex h-dvh max-h-dvh flex-col bg-sidebar overflow-hidden">
			{/* <div className="min-h-0 flex-1 overflow-y-auto"> */}

			<RootProvider account={account} organizations={organizations}>
				<AdminNavigation />
				<Wrapper className="">
					{/* <AdminSubNavigation /> */}
					<div className="relative h-full max-h-full">{children}</div>
				</Wrapper>
			</RootProvider>

			{/* </div> */}
		</div>
	);
}
