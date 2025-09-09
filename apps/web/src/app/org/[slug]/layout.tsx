import type { Metadata } from "next";
import type React from "react";
import Navigation from "@/app/components/org/layout/navigation";
import { getOrganizationPublic } from "@/app/lib/serverFunctions";

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
			<div className="flex h-dvh flex-col overflow-hidden">
				<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
			</div>
		);
	}

	return (
		<div className="flex h-dvh flex-col overflow-hidden max-w-7xl mx-auto">
			<Navigation organization={organization} />
			<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
		</div>
	);
}
