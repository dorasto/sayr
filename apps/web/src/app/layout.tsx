import type { Metadata } from 'next';
import type React from 'react';
import { ThemeProvider } from './components/theme-provider';

import './globals.css';

export const metadata: Metadata = {
	title: 'Turbo Starter',
	description: 'A production-ready monorepo starter with Next.js 15, Turborepo, and Shadcn UI.',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body >
				<meta name="apple-mobile-web-app-title" content="TurboStarter" />
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
