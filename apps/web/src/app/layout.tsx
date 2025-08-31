import { Toaster } from "@repo/ui/components/sonner";
import type { Metadata } from "next";
import type React from "react";
import { ThemeProvider } from "./components/theme-provider";
import "./globals.css";

const name = process.env.NEXT_PUBLIC_PROJECT_NAME;
export const metadata: Metadata = {
	title: {
		template: `%s | ${name}`,
		default: `${name}`,
	},
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
		<html lang="en" suppressHydrationWarning>
			<body className="relative">
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					{children}

					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
