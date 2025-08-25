import { auth } from "@repo/auth";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Code2, Container, Layers, Package, Palette, Rocket, Sparkles, Zap } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import ClipboardButton from "@/app/components/clipboard-button";
import { ThemeToggle } from "@/app/components/theme-toggle";
import LoginDialog from "../components/auth/login";
import { HeroSectionWithBeamsAndGrid } from "../components/home/hero";

const features = [
	{
		icon: <Zap className="w-5 h-5" />,
		title: "Lightning Fast",
		description: "Optimized builds with intelligent caching and parallel execution",
	},
	{
		icon: <Palette className="w-5 h-5" />,
		title: "Modern UI",
		description: "Pre-configured Shadcn UI components with Tailwind CSS",
	},
	{
		icon: <Rocket className="w-5 h-5" />,
		title: "Production Ready",
		description: "Next.js 15 with Turbopack for optimal performance",
	},
	{
		icon: <Sparkles className="w-5 h-5" />,
		title: "Developer Experience",
		description: "Biome.js for fast, unified linting and formatting",
	},
	{
		icon: <Container className="w-5 h-5" />,
		title: "Containerized",
		description: "Docker Compose setup for consistent development",
	},
	{
		icon: <Package className="w-5 h-5" />,
		title: "Monorepo Structure",
		description: "Efficient workspace management with pnpm",
	},
];

const techStack = [
	{ name: "Next.js 15", color: "bg-black text-white dark:bg-white dark:text-black", url: "https://nextjs.org" },
	{ name: "Turborepo", color: "bg-linear-to-r from-[#FF1E56] to-[#0196FF] text-white", url: "https://turbo.build" },
	{
		name: "Shadcn UI",
		color: "bg-[#0a0a0a] text-white dark:bg-zinc-100 dark:text-[#0a0a0a]",
		url: "https://ui.shadcn.com",
	},
	{
		name: "Tailwind CSS",
		color: "bg-[#00bcff] text-white",
		url: "https://tailwindcss.com",
	},
	{ name: "Biome.js", color: "bg-[#60a5fa] text-black", url: "https://biomejs.dev" },
	{ name: "TypeScript", color: "bg-[#3178c6] text-white", url: "https://www.typescriptlang.org" },
	{ name: "Docker", color: "bg-[#1d63ed] text-white", url: "https://www.docker.com" },
	{ name: "pnpm", color: "bg-[#f69220] text-black", url: "https://pnpm.io" },
];

export default async function Home() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	console.log("🚀 ~ Home ~ session:", session);
	return (
		<div className="">
			<HeroSectionWithBeamsAndGrid />
			<HeroSectionWithBeamsAndGrid />
			<HeroSectionWithBeamsAndGrid />
			<HeroSectionWithBeamsAndGrid />
			<HeroSectionWithBeamsAndGrid />
			<HeroSectionWithBeamsAndGrid />
		</div>
	);
}
