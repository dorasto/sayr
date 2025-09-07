import type { Metadata, Viewport } from "next";
import type React from "react";

export const metadata: Metadata = {
	title: "Organization",
	description: "Organization page for project management tool",
	icons: {
		icon: "/favicon.ico",
		shortcut: "/favicon-16x16.png",
		apple: "/apple-touch-icon.png",
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
};

export default function OrgLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex h-dvh flex-col overflow-hidden">
			<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
		</div>
	);
}
