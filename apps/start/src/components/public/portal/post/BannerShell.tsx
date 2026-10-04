import { cn } from "@repo/ui/lib/utils";

interface BannerShellProps {
	tone: "ok" | "bad" | "neutral";
	icon: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}

/** The tinted card a post status banner renders in: icon tile, title + description, optional action on the right. */
export function BannerShell({ tone, icon, title, description, action, className }: BannerShellProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-3.5 rounded-xl border px-[18px] py-4 max-md:flex-wrap",
				tone === "ok" && "border-success/40 bg-success/15",
				tone === "bad" && "border-destructive/35 bg-background",
				tone === "neutral" && "border-border bg-background",
				className
			)}
		>
			<span
				aria-hidden
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-lg",
					tone === "ok" && "bg-success text-background",
					tone === "bad" && "bg-destructive/15 text-destructive",
					tone === "neutral" && "bg-muted text-muted-foreground"
				)}
			>
				{icon}
			</span>
			<div className="min-w-0 flex-1">
				<div className="font-semibold text-[15px] text-foreground">{title}</div>
				{description && (
					<div className="mt-0.5 text-[13.5px] text-muted-foreground leading-[21px]">{description}</div>
				)}
			</div>
			{action && <div className="max-md:basis-full max-md:[&>*]:w-full">{action}</div>}
		</div>
	);
}
