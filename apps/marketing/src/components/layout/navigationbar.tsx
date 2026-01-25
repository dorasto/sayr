import {
	IconChevronDown as ChevronDown,
	IconChevronRight as ChevronRight,
	IconMenu2 as Menu,
	IconX as X,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const products = [
	{ title: "Analytics", desc: "Monitor key metrics", href: "#" },
	{ title: "Automation", desc: "Build powerful flows", href: "#" },
	{ title: "Billing", desc: "Manage subscriptions", href: "#" },
	{ title: "Audiences", desc: "Segment your data", href: "#" },
];
const resources = [
	{ title: "Docs", desc: "Developer guides", href: "#" },
	{ title: "Tutorials", desc: "Step-by-step", href: "#" },
	{ title: "Templates", desc: "Jumpstart UI", href: "#" },
	{ title: "Community", desc: "Join discussions", href: "#" },
];

const tapProps = {
	whileTap: { scale: 0.98 },
	transition: {
		type: "spring" as const,
		stiffness: 500,
		damping: 30,
		mass: 0.6,
	},
};

export function Navbar() {
	const [open, setOpen] = useState(false);
	const [megaOpen, setMegaOpen] = useState(false);

	return (
		<header className="bg-background/50 backdrop-blur w-full rounded-lg border border-t-0 rounded-t-none p-3 sticky top-0">
			<div className="mx-auto">
				<div className="flex items-center justify-between gap-4">
					<div className="flex w-full items-center justify-between gap-3 md:w-auto">
						<span className="font-semibold">Logo</span>
						<motion.button
							aria-label="Toggle menu"
							className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-md border md:hidden"
							onClick={() => setOpen((s) => !s)}
							whileTap={{ scale: 0.92 }}
						>
							{open ? <X size={20} /> : <Menu size={20} />}
						</motion.button>
					</div>

					<nav className="hidden items-center gap-2 md:flex">
						<div className="relative">
							<motion.button
								onMouseEnter={() => setMegaOpen(true)}
								onMouseLeave={() => setMegaOpen(false)}
								className="hover:bg-muted inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm"
								whileTap={{ scale: 0.97 }}
								whileHover={{ y: -1 }}
							>
								Products <ChevronDown size={16} />
							</motion.button>
							<AnimatePresence>
								{megaOpen && (
									<motion.div
										onMouseEnter={() => setMegaOpen(true)}
										onMouseLeave={() => setMegaOpen(false)}
										initial={{ opacity: 0, y: -6 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -6 }}
										className="bg-card absolute top-full left-0 z-20 mt-2 w-[42rem] rounded-xl p-4 ring shadow-sm shadow-black/10 ring-black/10 dark:shadow-white/10 dark:ring-white/10"
									>
										<div className="grid grid-cols-2 gap-4">
											<div className="rounded-lg p-3">
												<p className="text-muted-foreground px-1 pb-2 text-xs uppercase">Products</p>
												<ul className="grid gap-2">
													{products.map((p) => (
														<li key={p.title}>
															<motion.a
																href={p.href}
																className="hover:bg-muted block rounded-md px-2 py-2"
																whileHover={{ x: 2 }}
																whileTap={{ scale: 0.98 }}
															>
																<p className="text-sm font-medium">{p.title}</p>
																<p className="text-muted-foreground text-xs">{p.desc}</p>
															</motion.a>
														</li>
													))}
												</ul>
											</div>
											<div className="rounded-lg p-3">
												<p className="text-muted-foreground px-1 pb-2 text-xs uppercase">Resources</p>
												<ul className="grid gap-2">
													{resources.map((r) => (
														<li key={r.title}>
															<motion.a
																href={r.href}
																className="hover:bg-muted block rounded-md px-2 py-2"
																whileHover={{ x: 2 }}
																whileTap={{ scale: 0.98 }}
															>
																<p className="text-sm font-medium">{r.title}</p>
																<p className="text-muted-foreground text-xs">{r.desc}</p>
															</motion.a>
														</li>
													))}
												</ul>
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
						<motion.a
							href="#"
							className="hover:bg-muted rounded-md px-3 py-2 text-sm"
							whileHover={{ y: -1 }}
							whileTap={{ scale: 0.97 }}
						>
							Pricing
						</motion.a>
						<motion.a
							href="/docs"
							className="hover:bg-muted rounded-md px-3 py-2 text-sm"
							whileHover={{ y: -1 }}
							whileTap={{ scale: 0.97 }}
						>
							Documentation
						</motion.a>
					</nav>

					<div className="hidden items-center gap-2 md:flex">
						<motion.button
							{...tapProps}
							className="hidden rounded-full bg-primary px-8 py-2 text-sm font-bold text-primary-foreground md:block"
						>
							Get started
						</motion.button>
					</div>
				</div>

				<AnimatePresence initial={false}>
					{open && (
						<motion.div
							initial={{ opacity: 0, y: -6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -6 }}
							className="border-t py-2 md:hidden"
						>
							<details className="px-3">
								<summary className="hover:bg-muted flex cursor-pointer list-none items-center justify-between rounded-md px-0 py-2 text-sm">
									<span>Products</span>
									<ChevronDown size={16} />
								</summary>
								<div className="mt-2 rounded-lg border p-2">
									<p className="text-muted-foreground px-1 pb-2 text-xs uppercase">Products</p>
									<ul className="grid gap-1">
										{products.map((p) => (
											<li key={p.title}>
												<motion.a
													href={p.href}
													className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-2 text-sm"
													whileHover={{ x: 2 }}
													whileTap={{ scale: 0.98 }}
												>
													<div className="min-w-0">
														<p className="font-medium">{p.title}</p>
														<p className="text-muted-foreground text-xs">{p.desc}</p>
													</div>
													<ChevronRight size={16} className="text-muted-foreground ml-3 shrink-0" />
												</motion.a>
											</li>
										))}
									</ul>
									<p className="text-muted-foreground px-1 pt-3 pb-2 text-xs uppercase">Resources</p>
									<ul className="grid gap-1">
										{resources.map((r) => (
											<li key={r.title}>
												<motion.a
													href={r.href}
													className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-2 text-sm"
													whileHover={{ x: 2 }}
													whileTap={{ scale: 0.98 }}
												>
													<div className="min-w-0">
														<p className="font-medium">{r.title}</p>
														<p className="text-muted-foreground text-xs">{r.desc}</p>
													</div>
													<ChevronRight size={16} className="text-muted-foreground ml-3 shrink-0" />
												</motion.a>
											</li>
										))}
									</ul>
								</div>
							</details>
							<motion.a
								href="#"
								className="hover:bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm"
								whileHover={{ x: 2 }}
								whileTap={{ scale: 0.98 }}
							>
								<span>Pricing</span>
								<ChevronRight size={16} className="text-muted-foreground" />
							</motion.a>
							<motion.a
								href="#"
								className="hover:bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm"
								whileHover={{ x: 2 }}
								whileTap={{ scale: 0.98 }}
							>
								<span>Company</span>
								<ChevronRight size={16} className="text-muted-foreground" />
							</motion.a>
							<div className="flex items-center gap-2 px-3 pt-2">
								<motion.button
									{...tapProps}
									className="ml-auto rounded-full bg-black px-4 py-2 text-sm font-bold text-white shadow-[0px_-2px_0px_0px_rgba(255,255,255,0.4)_inset] dark:bg-white dark:text-black"
								>
									Contact sales
								</motion.button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</header>
	);
}
