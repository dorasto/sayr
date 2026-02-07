import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Globe, Lock, Check, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function VisibilityDemo() {
	const [isPublic, setIsPublic] = useState(false);

	return (
		<section className="py-24 px-6 relative">
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,var(--primary)_0%,transparent_50%)] opacity-[0.03]" />

			<div className="relative z-10 max-w-(--breakpoint-lg) mx-auto">
				<div className="grid md:grid-cols-2 gap-12 items-start">
					<div className="md:sticky md:top-24">
						<Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
							See It In Action
						</Badge>
						<h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
							Same board, <span className="text-primary">two audiences</span>
						</h2>
						<p className="text-muted-foreground mb-4">
							Toggle between what your team sees internally and what external users see on the public portal. Private tasks, internal labels, and internal comments disappear from the public view entirely.
						</p>
						<p className="text-sm text-muted-foreground mb-6">
							Visibility is set at the entity level — each task is public or private, each label is public or private, and each comment is public or internal.
						</p>
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setIsPublic(false)}
								className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${!isPublic ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"}`}
							>
								<Lock className="size-3.5" /> Internal View
							</button>
							<button
								type="button"
								onClick={() => setIsPublic(true)}
								className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isPublic ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"}`}
							>
								<Globe className="size-3.5" /> Public View
							</button>
						</div>
					</div>

					{/* Demo card */}
					<div className="space-y-3">
						{/* Public task */}
						<div className="rounded-2xl border bg-card shadow-xl overflow-hidden">
							<div className="px-5 py-3 border-b bg-muted/20 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground font-mono">SAY-188</span>
									<Badge className="text-[10px] py-0" variant="outline">
										<Globe className="size-2.5 mr-0.5" /> Public
									</Badge>
								</div>
								<Badge variant="secondary" className="text-xs">In Progress</Badge>
							</div>
							<div className="p-5 space-y-3">
								<h3 className="text-base font-semibold">Add dark mode support for the dashboard</h3>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Users have been requesting a dark theme for the main dashboard. This would improve accessibility and reduce eye strain during extended sessions.
								</p>

								{/* Labels */}
								<div>
									<p className="text-[10px] text-muted-foreground mb-1.5">Labels</p>
									<div className="flex flex-wrap gap-1.5">
										<span className="inline-flex items-center gap-1 text-[10px] py-0.5 px-2 rounded-full bg-muted border border-border">
											<span className="size-2 rounded-full bg-[#8b5cf6]" />
											UI/UX
										</span>
										<span className="inline-flex items-center gap-1 text-[10px] py-0.5 px-2 rounded-full bg-muted border border-border">
											<span className="size-2 rounded-full bg-[#14b8a6]" />
											Accessibility
										</span>
										<AnimatePresence>
											{!isPublic && (
												<motion.span
													initial={{ opacity: 0, scale: 0.8, width: 0 }}
													animate={{ opacity: 1, scale: 1, width: "auto" }}
													exit={{ opacity: 0, scale: 0.8, width: 0 }}
													transition={{ duration: 0.2 }}
													className="inline-flex items-center gap-1 text-[10px] py-0.5 px-2 rounded-full border border-dashed border-primary/20 bg-primary/5 overflow-hidden whitespace-nowrap"
												>
													<Lock className="size-2 text-primary/50" />
													<span className="size-2 rounded-full bg-[#f59e0b]" />
													Sprint 16
												</motion.span>
											)}
										</AnimatePresence>
									</div>
								</div>

								{/* Metadata */}
								<div className="grid grid-cols-2 gap-2">
									<div className="py-1.5 px-3 rounded-md bg-muted/40">
										<p className="text-[10px] text-muted-foreground">Category</p>
										<p className="text-xs font-medium">Feature Request</p>
									</div>
									<div className="py-1.5 px-3 rounded-md bg-muted/40">
										<p className="text-[10px] text-muted-foreground">Votes</p>
										<p className="text-xs font-medium">42 upvotes</p>
									</div>
								</div>

								{/* Comments */}
								<div className="pt-3 border-t">
									<p className="text-xs font-semibold text-muted-foreground mb-2">
										{isPublic ? "Comments" : "All Comments (public + internal)"}
									</p>
									<div className="space-y-1.5">
										<div className="py-2 px-3 rounded-md bg-muted/40 text-xs">
											<div className="flex items-center gap-1.5 mb-0.5">
												<span className="font-medium">jamie_dev</span>
												<Globe className="size-2.5 text-muted-foreground/50" />
												<span className="text-muted-foreground/50 ml-auto">2d ago</span>
											</div>
											<p className="text-muted-foreground">Would love this! Dark mode is essential for late night work.</p>
										</div>
										<div className="py-2 px-3 rounded-md bg-muted/40 text-xs">
											<div className="flex items-center gap-1.5 mb-0.5">
												<span className="font-medium">sarah_k</span>
												<Globe className="size-2.5 text-muted-foreground/50" />
												<span className="text-muted-foreground/50 ml-auto">1d ago</span>
											</div>
											<p className="text-muted-foreground">Any timeline on when this ships? Our team uses the dashboard heavily.</p>
										</div>
										<AnimatePresence>
											{!isPublic && (
												<motion.div
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: "auto" }}
													exit={{ opacity: 0, height: 0 }}
													transition={{ duration: 0.3 }}
													className="overflow-hidden"
												>
													<div className="py-2 px-3 rounded-md bg-primary/5 border border-dashed border-primary/15 text-xs">
														<div className="flex items-center gap-1.5 mb-0.5">
															<span className="font-medium">tom</span>
															<Lock className="size-2.5 text-primary/50" />
															<Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/20 text-primary">
																Internal
															</Badge>
															<span className="text-muted-foreground/50 ml-auto">6h ago</span>
														</div>
														<p className="text-muted-foreground">Design tokens PR is merged. Starting implementation today. ETA Tuesday.</p>
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</div>
							</div>
						</div>

						{/* Private task — only visible in internal view */}
						<AnimatePresence>
							{!isPublic && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.3 }}
									className="overflow-hidden"
								>
									<div className="rounded-2xl border border-dashed border-primary/20 bg-card shadow-lg overflow-hidden">
										<div className="px-5 py-3 border-b bg-primary/5 flex items-center justify-between">
											<div className="flex items-center gap-2">
												<span className="text-xs text-muted-foreground font-mono">SAY-192</span>
												<Badge className="text-[10px] py-0 border-primary/20 text-primary" variant="outline">
													<Lock className="size-2.5 mr-0.5" /> Private
												</Badge>
											</div>
											<Badge variant="secondary" className="text-xs">In Progress</Badge>
										</div>
										<div className="p-5 space-y-3">
											<h3 className="text-base font-semibold">Migrate auth to session cookies</h3>
											<p className="text-xs text-muted-foreground leading-relaxed">
												Move from JWT tokens to httpOnly session cookies for improved security. Requires backend refactor and client-side auth flow updates.
											</p>
											<div className="flex flex-wrap gap-1.5">
												<span className="inline-flex items-center gap-1 text-[10px] py-0.5 px-2 rounded-full bg-muted border border-border">
													<span className="size-2 rounded-full bg-[#f97316]" />
													Auth
												</span>
												<span className="inline-flex items-center gap-1 text-[10px] py-0.5 px-2 rounded-full bg-muted border border-border">
													<span className="size-2 rounded-full bg-[#ef4444]" />
													Security
												</span>
												<span className="inline-flex items-center gap-1 text-[10px] py-0.5 px-2 rounded-full border border-dashed border-primary/20 bg-primary/5">
													<Lock className="size-2 text-primary/50" />
													<span className="size-2 rounded-full bg-[#f59e0b]" />
													Sprint 16
												</span>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<div className="py-1.5 px-3 rounded-md bg-muted/40">
													<p className="text-[10px] text-muted-foreground">Priority</p>
													<p className="text-xs font-medium">High</p>
												</div>
												<div className="py-1.5 px-3 rounded-md bg-muted/40">
													<p className="text-[10px] text-muted-foreground">Assignee</p>
													<p className="text-xs font-medium">Alex Chen</p>
												</div>
											</div>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>

						{/* Explanation */}
						<div className="rounded-xl bg-muted/40 border p-4 text-xs text-muted-foreground">
							<div className="flex items-start gap-2">
								{isPublic ? (
									<>
										<Eye className="size-4 text-success shrink-0 mt-0.5" />
										<div>
											<p className="font-medium text-foreground mb-1">Public view</p>
											<p>External users see the public task with its public labels and public comments. The private task, private labels, and internal comments are completely hidden.</p>
										</div>
									</>
								) : (
									<>
										<EyeOff className="size-4 text-primary shrink-0 mt-0.5" />
										<div>
											<p className="font-medium text-foreground mb-1">Internal view</p>
											<p>Your team sees everything — both public and private tasks, all labels regardless of visibility, and all comments including internal ones.</p>
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
