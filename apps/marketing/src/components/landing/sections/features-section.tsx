import { motion } from "motion/react";
import {
	Eye,
	EyeOff,
	GitBranch,
	Globe,
	MessageSquareText,
	ShieldCheck,
	Star,
	Zap,
	Check,
	CircleDot,
	GitPullRequest,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function FeaturesSection() {
	return (
		<section className="py-24 px-6">
			<div className="max-w-(--breakpoint-lg) mx-auto">
				<div className="text-center mb-16">
					<Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
						Features
					</Badge>
					<h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
						Everything your team needs,{" "}
						<span className="text-primary">nothing your users shouldn't see</span>
					</h2>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
						Project management, user feedback, and public transparency — all in one tool. Visibility controls are built into tasks, labels, and comments.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					{/* Large card - Visibility Control */}
					<motion.div
						whileHover={{ scale: 1.01 }}
						transition={{ type: "spring", stiffness: 400, damping: 30 }}
						className="md:col-span-2 md:row-span-2 rounded-2xl border bg-card p-8 relative overflow-hidden group"
					>
						<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
						<div className="relative z-10">
							<div className="flex items-center gap-3 mb-6">
								<div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
									<Eye className="size-6 text-primary" />
								</div>
							</div>
							<h3 className="text-2xl font-semibold mb-3">Visibility Control</h3>
							<p className="text-muted-foreground mb-6">
								Tasks, labels, and comments each have their own visibility setting. Mark a task as public or private. Keep sprint labels internal while feature labels stay visible. Write internal comments only your team can see, alongside public ones your users read.
							</p>
							{/* Inline demo */}
							<div className="space-y-1.5">
								{[
									{ entity: "Task", name: "Add dark mode support", vis: "public", type: "task" },
									{ entity: "Task", name: "Fix auth token refresh", vis: "private", type: "task" },
									{ entity: "Label", name: "Feature Request", vis: "public", type: "label" },
									{ entity: "Label", name: "Sprint 16 - Q1", vis: "private", type: "label" },
									{ entity: "Comment", name: "\"Would love this! Dark mode is essential.\"", vis: "public", type: "comment" },
									{ entity: "Comment", name: "\"Blocked by design tokens PR. ETA Tuesday.\"", vis: "internal", type: "comment" },
								].map((item) => (
									<div
										key={`${item.entity}-${item.name}`}
										className={`flex items-center justify-between py-1.5 px-3 rounded-md text-xs ${item.vis === "private" || item.vis === "internal" ? "bg-muted/30 border border-dashed border-primary/10" : "bg-muted/50"}`}
									>
										<div className="flex items-center gap-2 min-w-0">
											<span className="text-muted-foreground/60 shrink-0 w-16">{item.entity}</span>
											<span
												className={`font-medium truncate ${item.vis === "private" || item.vis === "internal" ? "text-muted-foreground" : "text-foreground"}`}
											>
												{item.name}
											</span>
										</div>
										<div className="flex items-center gap-1.5 shrink-0 ml-2">
											<span className={`text-[10px] ${item.vis === "public" ? "text-success" : "text-muted-foreground/50"}`}>
												{item.vis}
											</span>
											{item.vis === "public" ? (
												<Eye className="size-3 text-success" />
											) : (
												<EyeOff className="size-3 text-muted-foreground/40" />
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					</motion.div>

					{/* Public Portal */}
					<motion.div
						whileHover={{ scale: 1.02 }}
						className="rounded-2xl border bg-card p-6 group hover:border-primary/30 transition-colors"
					>
						<Globe className="size-8 text-primary mb-4" />
						<h3 className="font-semibold mb-1.5">Public Portal</h3>
						<p className="text-xs text-muted-foreground leading-relaxed">
							A customer-facing hub where external users browse public tasks, submit feature requests and bug reports, and track what your team is working on. No app access needed.
						</p>
					</motion.div>

					{/* User Voting */}
					<motion.div
						whileHover={{ scale: 1.02 }}
						className="rounded-2xl border bg-card p-6 group hover:border-primary/30 transition-colors"
					>
						<Star className="size-8 text-primary mb-4" />
						<h3 className="font-semibold mb-1.5">User Voting</h3>
						<p className="text-xs text-muted-foreground leading-relaxed">
							Users upvote features and bug reports they care about. Vote counts are visible on tasks so your team can prioritize based on real demand.
						</p>
					</motion.div>

					{/* Dual Comments */}
					<motion.div
						whileHover={{ scale: 1.02 }}
						className="rounded-2xl border bg-card p-6 group hover:border-primary/30 transition-colors"
					>
						<MessageSquareText className="size-8 text-primary mb-4" />
						<h3 className="font-semibold mb-1.5">Public & Internal Comments</h3>
						<p className="text-xs text-muted-foreground leading-relaxed">
							One timeline, two audiences. Public comments are visible to everyone. Internal comments are only for your team. No more switching tools to discuss context.
						</p>
					</motion.div>

					{/* Real-time */}
					<motion.div
						whileHover={{ scale: 1.02 }}
						className="rounded-2xl border bg-card p-6 group hover:border-primary/30 transition-colors"
					>
						<Zap className="size-8 text-primary mb-4" />
						<h3 className="font-semibold mb-1.5">Real-Time Updates</h3>
						<p className="text-xs text-muted-foreground leading-relaxed">
							WebSocket-powered live collaboration. When a teammate moves a task, assigns a label, or posts a comment — everyone sees it instantly. No refresh needed.
						</p>
					</motion.div>

					{/* Large card - GitHub Integration */}
					<motion.div
						whileHover={{ scale: 1.01 }}
						transition={{ type: "spring", stiffness: 400, damping: 30 }}
						className="md:col-span-2 rounded-2xl border bg-card p-8 relative overflow-hidden group"
					>
						<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
						<div className="relative z-10">
							<div className="flex gap-6 items-start">
								<div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
									<GitBranch className="size-6 text-primary" />
								</div>
								<div>
									<h3 className="text-xl font-semibold mb-2">Deep GitHub Integration</h3>
									<p className="text-sm text-muted-foreground mb-4">
										Link repositories, sync issues bidirectionally, and track branches and pull requests from inside Sayr. GitHub connections are visible to your team and stay internal to the app.
									</p>
									{/* Mini GitHub demo */}
									<div className="space-y-2">
										<div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/50">
											<GitBranch className="size-3.5 text-primary" />
											<span className="font-mono">feat/dark-mode</span>
											<span className="text-muted-foreground/50">{"\u2192"}</span>
											<span>SAY-188</span>
										</div>
										<div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/50">
											<GitPullRequest className="size-3.5 text-success" />
											<span className="font-mono">PR #287</span>
											<Badge variant="outline" className="text-[10px] py-0 px-1.5 text-success border-success/30">
												Merged
											</Badge>
											<span className="text-muted-foreground/50">{"\u2192"}</span>
											<span>SAY-188 status {"\u2192"} Done</span>
										</div>
										<div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/50">
											<CircleDot className="size-3.5 text-primary" />
											<span className="font-mono">Issue #54</span>
											<span className="text-muted-foreground/50">{"\u2194"}</span>
											<span>SAY-201 (synced)</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</motion.div>

					{/* Large card - RBAC */}
					<motion.div
						whileHover={{ scale: 1.01 }}
						transition={{ type: "spring", stiffness: 400, damping: 30 }}
						className="md:col-span-2 rounded-2xl border bg-card p-8 relative overflow-hidden group"
					>
						<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
						<div className="relative z-10">
							<div className="flex gap-6 items-start">
								<div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
									<ShieldCheck className="size-6 text-primary" />
								</div>
								<div>
									<h3 className="text-xl font-semibold mb-2">Role-Based Access Control</h3>
									<p className="text-sm text-muted-foreground mb-4">
										External users submit and vote. Members manage tasks. Admins control visibility, permissions, and integrations. Everyone has a distinct role, and no one sees more than they should.
									</p>
									<div className="grid grid-cols-3 gap-2">
										{[
											{
												role: "External Users",
												perms: ["View public tasks", "Submit feedback", "Vote on features", "Comment publicly"],
											},
											{
												role: "Members",
												perms: [
													"Full task management",
													"Internal comments",
													"Assign & label",
													"View all data",
												],
											},
											{
												role: "Admins",
												perms: [
													"Manage visibility",
													"Configure integrations",
													"User management",
													"Organization settings",
												],
											},
										].map((r) => (
											<div key={r.role} className="p-3 rounded-lg bg-muted/40">
												<p className="text-xs font-semibold mb-2">{r.role}</p>
												<ul className="space-y-1">
													{r.perms.map((p) => (
														<li key={p} className="text-[10px] text-muted-foreground flex items-center gap-1">
															<Check className="size-2.5 text-primary shrink-0" /> {p}
														</li>
													))}
												</ul>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
