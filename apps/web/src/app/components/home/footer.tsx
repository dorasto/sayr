import TasqIcon from "@repo/ui/components/brand-icon";
import Link from "next/link";
import React from "react";

export function Footer() {
	const pages = [
		{
			title: "All Products",
			href: "#",
		},
		// {
		// 	title: "Studio",
		// 	href: "#",
		// },
		// {
		// 	title: "Clients",
		// 	href: "#",
		// },
		// {
		// 	title: "Pricing",
		// 	href: "#",
		// },
		// {
		// 	title: "Blog",
		// 	href: "#",
		// },
	];

	const socials = [
		{
			title: "Facebook",
			href: "#",
		},
		// {
		// 	title: "Instagram",
		// 	href: "#",
		// },
		// {
		// 	title: "Twitter",
		// 	href: "#",
		// },
		// {
		// 	title: "LinkedIn",
		// 	href: "#",
		// },
	];
	const legals = [
		{
			title: "Privacy Policy",
			href: "#",
		},
		// {
		// 	title: "Terms of Service",
		// 	href: "#",
		// },
		// {
		// 	title: "Cookie Policy",
		// 	href: "#",
		// },
	];

	const signups = [
		{
			title: "Sign Up",
			href: "/login",
		},
		// {
		// 	title: "Forgot Password",
		// 	href: "#",
		// },
	];
	return (
		<div className="relative w-full overflow-hidden border-t px-8 py-20 border bg-background">
			<div className="mx-auto flex max-w-7xl flex-col items-start justify-between text-sm text-muted-foreground sm:flex-row md:px-8">
				<div>
					<div className="mr-0 mb-4 md:mr-4 md:flex">
						<Logo />
					</div>

					<div className="mt-2 ml-2">&copy; 2025 Doras Media Limited. All rights reserved.</div>
				</div>
				<div className="mt-10 grid grid-cols-2 items-start gap-10 sm:mt-0 md:mt-0 lg:grid-cols-4">
					<div className="flex w-full flex-col justify-center space-y-4">
						<p className="hover:text-text-neutral-800 font-bold text-muted-foreground transition-colors ">
							Pages
						</p>
						<ul className="hover:text-text-neutral-800 list-none space-y-4 text-muted-foreground transition-colors ">
							{pages.map((page) => (
								<li key={page.href} className="list-none">
									<Link className="hover:text-foreground transition-colors" href="/products">
										{page.title}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div className="flex flex-col justify-center space-y-4">
						<p className="hover:text-text-neutral-800 font-bold text-muted-foreground transition-colors ">
							Socials
						</p>
						<ul className="hover:text-text-neutral-800 list-none space-y-4 text-muted-foreground transition-colors ">
							{socials.map((social) => (
								<li key={social.href} className="list-none">
									<Link className="hover:text-foreground transition-colors" href="/products">
										{social.title}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div className="flex flex-col justify-center space-y-4">
						<p className="hover:text-text-neutral-800 font-bold text-muted-foreground transition-colors ">
							Legal
						</p>
						<ul className="hover:text-text-neutral-800 list-none space-y-4 text-muted-foreground transition-colors ">
							{legals.map((legal) => (
								<li key={legal.href} className="list-none">
									<Link className="hover:text-foreground transition-colors" href="/products">
										{legal.title}
									</Link>
								</li>
							))}
						</ul>
					</div>
					<div className="flex flex-col justify-center space-y-4">
						<p className="hover:text-text-neutral-800 font-bold text-muted-foreground transition-colors ">
							Register
						</p>
						<ul className="hover:text-text-neutral-800 list-none space-y-4 text-muted-foreground transition-colors ">
							{signups.map((auth) => (
								<li key={auth.href} className="list-none">
									<Link className="hover:text-foreground transition-colors" href="/products">
										{auth.title}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}

const Logo = () => {
	return (
		<Link
			href="/"
			className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-foreground"
		>
			{/* <img src="https://assets.aceternity.com/logo-dark.png" alt="logo" width={30} height={30} /> */}

			<TasqIcon className="text-primary" size={40} strokeWidth={1.5} />

			<span className="font-medium text-foreground">sayr.io</span>
		</Link>
	);
};
