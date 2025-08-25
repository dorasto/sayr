import { auth } from '@repo/auth';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card';
import {
	Code2,
	Container,
	Layers,
	Package,
	Palette,
	Rocket,
	Sparkles,
	Zap,
} from 'lucide-react';
import Link from 'next/link';
import ClipboardButton from '@/app/components/clipboard-button';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { headers } from 'next/headers';

const features = [
	{
		icon: <Zap className="w-5 h-5" />,
		title: 'Lightning Fast',
		description: 'Optimized builds with intelligent caching and parallel execution',
	},
	{
		icon: <Palette className="w-5 h-5" />,
		title: 'Modern UI',
		description: 'Pre-configured Shadcn UI components with Tailwind CSS',
	},
	{
		icon: <Rocket className="w-5 h-5" />,
		title: 'Production Ready',
		description: 'Next.js 15 with Turbopack for optimal performance',
	},
	{
		icon: <Sparkles className="w-5 h-5" />,
		title: 'Developer Experience',
		description: 'Biome.js for fast, unified linting and formatting',
	},
	{
		icon: <Container className="w-5 h-5" />,
		title: 'Containerized',
		description: 'Docker Compose setup for consistent development',
	},
	{
		icon: <Package className="w-5 h-5" />,
		title: 'Monorepo Structure',
		description: 'Efficient workspace management with pnpm',
	},
];

const techStack = [
	{ name: 'Next.js 15', color: 'bg-black text-white dark:bg-white dark:text-black', url: 'https://nextjs.org' },
	{ name: 'Turborepo', color: 'bg-linear-to-r from-[#FF1E56] to-[#0196FF] text-white', url: 'https://turbo.build' },
	{
		name: 'Shadcn UI',
		color: 'bg-[#0a0a0a] text-white dark:bg-zinc-100 dark:text-[#0a0a0a]',
		url: 'https://ui.shadcn.com',
	},
	{
		name: 'Tailwind CSS',
		color: 'bg-[#00bcff] text-white',
		url: 'https://tailwindcss.com',
	},
	{ name: 'Biome.js', color: 'bg-[#60a5fa] text-black', url: 'https://biomejs.dev' },
	{ name: 'TypeScript', color: 'bg-[#3178c6] text-white', url: 'https://www.typescriptlang.org' },
	{ name: 'Docker', color: 'bg-[#1d63ed] text-white', url: 'https://www.docker.com' },
	{ name: 'pnpm', color: 'bg-[#f69220] text-black', url: 'https://pnpm.io' },
];

export default async function Home() {
	    const session = await auth.api.getSession({
        headers: await headers()
    })
	    console.log("🚀 ~ Home ~ session:", session)
	return (
		<div className="min-h-screen bg-background">
			{/* Subtle gradient accent */}
			<div className="fixed inset-0 -z-10">
				<div className="absolute inset-0 bg-linear-to-br from-blue-50 via-background to-indigo-50 opacity-70 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20" />
				<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-20" />
				<div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-20" />
			</div>

			{/* Navigation */}
			<nav className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
				<div className="container mx-auto px-4 sm:px-6 py-4">
					<div className="flex items-center justify-between">
						{/* Right side - Desktop navigation + Theme toggle */}
						<div className="hidden md:flex items-center space-x-6">
							<Link
								href="#features"
								scroll={true}
								className="text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								Features
							</Link>
							<Link
								href="#quick-start"
								scroll={true}
								className="text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								Quick Start
							</Link>
							<ThemeToggle />
						</div>
						<div className="flex md:hidden items-center space-x-6">
							<ThemeToggle />
						</div>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="relative overflow-hidden">
				<div className="container mx-auto px-6 py-16 sm:py-20 md:py-24 lg:py-32">
					<div className="max-w-4xl mx-auto text-center space-y-8">
						{/* Badge */}
						<div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-1.5">
							<Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
							<span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
								v2.1 - Now with <b>Next.js 15</b> and <b>Tailwind CSS V4</b>
							</span>
						</div>

						{/* Main heading */}
						<div className="space-y-4">
							<h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-foreground tracking-tight">
								Build faster with
								<span className="bg-linear-to-r from-[#FF1E56] to-[#0196FF] bg-clip-text text-transparent">
									{' '}
									Turborepo
								</span>
							</h1>
							<p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
								A modern monorepo starter template that scales with your ambitions. Production-ready from day
								one.
							</p>
						</div>

						{/* CTA Buttons */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
							<Button
								variant="outline"
								size="lg"
								className="border-border hover:bg-accent px-8 w-full sm:w-auto"
								asChild
							>
								<Link href="https://turbo.build/repo/docs" target="_blank">
									Read Documentation
								</Link>
							</Button>
						</div>

						{/* Tech Stack Pills */}
						<div className="flex flex-col gap-3 pt-8">
							<div className="flex flex-wrap justify-center gap-2">
								{techStack.slice(0, 4).map((tech) => (
									<Link key={tech.name} href={tech.url} target="_blank" rel="noopener noreferrer">
										<Badge
											className={`${tech.color} border-0 hover:scale-105 transition-transform duration-200 px-3 pt-1.5 pb-2 select-none will-change-transform font-medium flex items-center justify-center leading-none cursor-pointer`}
										>
											{tech.name}
										</Badge>
									</Link>
								))}
							</div>
							<div className="flex flex-wrap justify-center gap-2">
								{techStack.slice(4).map((tech) => (
									<Link key={tech.name} href={tech.url} target="_blank" rel="noopener noreferrer">
										<Badge
											className={`${tech.color} border-0 hover:scale-105 transition-transform duration-200 px-3 pt-1.5 pb-2 select-none will-change-transform font-medium flex items-center justify-center leading-none cursor-pointer`}
										>
											{tech.name}
										</Badge>
									</Link>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Decorative element */}
				<div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />
			</section>

			{/* Features Grid */}
			<section id="features" className="py-24 bg-secondary/20">
				<div className="container mx-auto px-6">
					<div className="max-w-3xl mx-auto text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Everything you need to ship</h2>
						<p className="text-lg text-muted-foreground">
							Carefully selected tools and configurations to accelerate your development workflow
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
						{features.map((feature) => (
							<Card
								key={feature.title}
								className="border-border shadow-sm hover:shadow-md transition-all duration-200 bg-card flex flex-col h-full"
							>
								<CardHeader>
									<div className="w-12 h-12 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
										{feature.icon}
									</div>
									<CardTitle className="text-lg font-semibold text-card-foreground select-none">
										{feature.title}
									</CardTitle>
								</CardHeader>
								<CardContent className="grow">
									<CardDescription className="text-muted-foreground select-none">
										{feature.description}
									</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* Quick Start Section */}
			<section id="quick-start" className="py-24">
				<div className="container mx-auto px-6">
					<div className="max-w-4xl mx-auto">
						<div className="text-center mb-16">
							<h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Get up and running</h2>
							<p className="text-lg text-muted-foreground">
								Start building your next project in minutes, not hours
							</p>
						</div>

						<div className="grid md:grid-cols-2 gap-8">
							{/* Project Structure */}
							<Card className="border-border bg-card">
								<CardHeader>
									<div className="flex items-center space-x-3 mb-2">
										<div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/50 rounded-lg flex items-center justify-center">
											<Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
										</div>
										<CardTitle className="text-xl text-card-foreground">Project Structure</CardTitle>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="bg-muted rounded-lg p-4 font-mono text-sm text-muted-foreground">
										<div className="flex items-center space-x-2">
											<Code2 className="w-4 h-4 shrink-0" />
											<span className="shrink-0">apps/web</span>
											<span className="text-muted-foreground">→ Next.js application</span>
										</div>
										<div className="flex items-center space-x-2 mt-2">
											<Package className="w-4 h-4 shrink-0" />
											<span className="shrink-0">packages/ui</span>
											<span className="text-muted-foreground">→ Shared components</span>
										</div>
										<div className="flex items-center space-x-2 mt-2">
											<Container className="w-4 h-4 shrink-0" />
											<span className="shrink-0">docker-compose.yml</span>
											<span className="text-muted-foreground">→ Container setup</span>
										</div>
									</div>
									<p className="text-sm text-muted-foreground">
										Organized monorepo structure for scalable development
									</p>
								</CardContent>
							</Card>
						</div>

						{/* Commands */}
						<Card className="mt-8 border-border bg-linear-to-br from-muted/50 to-card">
							<CardHeader>
								<CardTitle className="text-xl text-card-foreground flex items-center space-x-2">
									<Rocket className="w-5 h-5" />
									<span>Available Commands</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid md:grid-cols-2 gap-4">
									{[
										{ cmd: 'pnpm build', desc: 'Build all packages and apps' },
										{ cmd: 'pnpm lint', desc: 'Check code quality across the monorepo' },
										{ cmd: 'pnpm format-write', desc: 'Auto-format all code with Biome' },
										{ cmd: 'pnpm docker', desc: 'Run the entire stack with Docker' },
									].map((item) => (
										<div
											key={item.cmd}
											className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3"
										>
											<code className="bg-background border border-border rounded px-3 py-1 text-sm font-mono text-blue-600 dark:text-blue-400 shrink-0 flex items-center justify-between">
												{item.cmd}
												<ClipboardButton cmd={item.cmd} />
											</code>
											<span className="text-sm text-muted-foreground">{item.desc}</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-border bg-background">
				<div className="container mx-auto px-6 py-6">
					<div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
						<div className="flex flex-wrap items-center justify-center md:justify-start space-x-6 text-sm text-muted-foreground">
							<Link
								href="https://turbo.build"
								target="_blank"
								className="hover:text-foreground transition-colors"
							>
								Turborepo
							</Link>
							<Link
								href="https://nextjs.org"
								target="_blank"
								className="hover:text-foreground transition-colors"
							>
								Next.js
							</Link>
							<Link
								href="https://ui.shadcn.com"
								target="_blank"
								className="hover:text-foreground transition-colors"
							>
								Shadcn UI
							</Link>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
