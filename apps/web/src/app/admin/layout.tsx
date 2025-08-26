import type { Metadata } from "next";
import type React from "react";
import AdminNavigation from "../components/layout/admin-navigation";
import { QueryClientProvider } from "../components/layout/query-provider";
import { Wrapper } from "../components/layout/wrapper";

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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<QueryClientProvider>
			<div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
				<AdminNavigation />
				{/* <div className="min-h-0 flex-1 overflow-y-auto"> */}
				<Wrapper>{children}</Wrapper>
				{/* </div> */}
			</div>
		</QueryClientProvider>
	);
}
