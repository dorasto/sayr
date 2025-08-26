import type { Metadata } from "next";
import type React from "react";
import Navigation from "../components/home/navigation";

export const metadata: Metadata = {
	title: "Home",
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
		<div className="flex h-dvh flex-col overflow-hidden">
			<Navigation />
			<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
		</div>
	);
}
