import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, getInitials } from "@repo/util";

interface PortalAvatarProps {
	name?: string | null;
	image?: string | null;
	/** Diameter in px. */
	size?: number;
	/** Team ring: 2px surface gap then a 1.5px accent ring. */
	ring?: boolean;
	className?: string;
}

/** Avatar with initials fallback and an optional accent ring that marks team members. */
export function PortalAvatar({ name, image, size = 28, ring = false, className }: PortalAvatarProps) {
	return (
		<Avatar
			className={cn(
				"shrink-0 rounded-full",
				ring && "shadow-[0_0_0_2px_var(--portal-surface),0_0_0_3.5px_var(--portal-accent)]",
				className
			)}
			style={{ width: size, height: size }}
		>
			{image ? <AvatarImage src={ensureCdnUrl(image)} alt={name ?? ""} /> : null}
			<AvatarFallback
				className="bg-[color-mix(in_oklch,var(--portal-fg)_15%,var(--portal-surface))] font-semibold text-portal-fg"
				style={{ fontSize: Math.max(12, Math.round(size * 0.39)) }}
			>
				{getInitials(name)}
			</AvatarFallback>
		</Avatar>
	);
}
