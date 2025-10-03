import { HeadlessToastConfig } from "@repo/ui/components/headless-toast";
import { Toaster } from "@repo/ui/components/sonner";
import type { Metadata } from "next";
import type React from "react";
import { ThemeProvider } from "./components/theme-provider";
import "./globals.css";
import { IconAlertCircle, IconAlertCircleFilled, IconCheck, IconInfoCircle, IconLoader2 } from "@tabler/icons-react";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { QueryClientProvider } from "./components/layout/query-provider";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
	display: "swap",
});

const sourceSerif = Source_Serif_4({
	subsets: ["latin"],
	variable: "--font-serif",
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
});

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
		<html
			lang="en"
			suppressHydrationWarning
			className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
		>
			<body className="relative">
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					<QueryClientProvider>
						<HeadlessToastConfig
							icons={{
								success: <IconCheck className="text-success" />,
								info: <IconInfoCircle className="text-primary" />,
								warning: <IconAlertCircle className=" text-amber-500" />,
								error: <IconAlertCircleFilled className="text-destructive" />,
								loading: <IconLoader2 className="animate-spin text-primary" />,
							}}
						/>
						{children}

						<Toaster
							icons={{
								success: <IconCheck />,
								info: <IconInfoCircle />,
								warning: <IconAlertCircle />,
								error: <IconAlertCircleFilled />,
								loading: <IconLoader2 />,
							}}
							toastOptions={{
								unstyled: true,
								duration: 10000,
							}}
						/>
					</QueryClientProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
