import { getOrganizationPublic } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import type { Metadata, Viewport } from "next";
import type React from "react";
import Navigation from "@/app/components/org/layout/navigation";
import { RootProviderOrganization } from "./Context";
export const dynamic = "force-dynamic";

interface OrgLayoutProps {
	params: Promise<{
		slug: string;
	}>;
}

export async function generateMetadata({ params }: OrgLayoutProps): Promise<Metadata> {
	const { slug } = await params;
	const organization = await getOrganizationPublic(slug);

	if (!organization) {
		return {
			title: "Organization Not Found",
			description: "The requested organization could not be found",
			icons: {
				icon: "/favicon.ico",
				shortcut: "/favicon-16x16.png",
				apple: "/apple-touch-icon.png",
			},
		};
	}

	return {
		title: organization.name,
		description: `${organization.name} organization page for project management`,
		icons: {
			icon: organization.logo || "/favicon.ico",
			shortcut: "/favicon-16x16.png",
			apple: "/apple-touch-icon.png",
		},
		openGraph: {
			title: organization.name,
			description: `${organization.name}  page for project management`,
			images: organization.bannerImg ? [organization.bannerImg] : undefined,
		},
		twitter: {
			card: "summary_large_image",
			title: `${organization.name} - Organization`,
			description: `${organization.name} organization page for project management`,
			images: organization.bannerImg ? [organization.bannerImg] : undefined,
		},
	};
}
export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "cyan" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
};
export default async function OrgLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
}> &
	OrgLayoutProps) {
	const { slug } = await params;
	const organization = await getOrganizationPublic(slug);

	if (!organization) {
		return (
			<>
				<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
				<title>Organization Not Available</title>
				<div className="via-surface to-surface flex h-screen items-center bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-primary">
					<div className="mx-auto max-w-xl text-center text-white">
						<h1 className="text-5xl font-black">Organization Not Available</h1>
						<p className="mb-7 mt-3">
							Sorry, this organization could not be found or isn’t available right now. It might have been
							removed or the link is incorrect.
						</p>
						<div className="flex place-content-center items-center gap-3">
							<a href="/">
								<Button className="!border-surface-100 text-surface-100 w-full p-4 font-bold">Back home</Button>
							</a>
							<a href="https://doras.to/discord">
								<Button className="!border-surface-100 text-surface-100 flex w-full gap-2 p-4 font-bold">
									Report an issue
								</Button>
							</a>
						</div>
					</div>
				</div>
			</>
		);
	}

	return (
		<RootProviderOrganization organization={organization}>
			<div className="flex h-dvh flex-col overflow-hidden max-w-7xl mx-auto">
				<Navigation />
				<div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
			</div>
		</RootProviderOrganization>
	);
}
