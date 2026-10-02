import { cn } from "@repo/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";

/**
 * Portal button class set. Use directly on a `<Link>` (`className={portalButtonVariants({ variant: "primary" })}`).
 * On phones (< 768px) every size is at least 44px tall, the minimum touch target.
 */
export const portalButtonVariants = cva(
	"inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-portal-focus disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				/** Surface + line-2 border. */
				default:
					"border border-portal-line-2 bg-portal-surface text-portal-fg hover:bg-portal-raised focus-visible:bg-portal-raised",
				/** Amber with dark on-accent text. */
				primary:
					"border border-transparent bg-portal-accent font-semibold text-portal-on-accent hover:bg-[oklch(0.82_0.165_76)] focus-visible:bg-[oklch(0.82_0.165_76)]",
				ghost: "border border-transparent bg-transparent text-portal-fg-2 hover:bg-portal-hover focus-visible:bg-portal-hover hover:text-portal-fg focus-visible:text-portal-fg",
			},
			size: {
				sm: "h-[30px] rounded-portal-sm px-2.5 text-[13px] max-md:h-11",
				md: "h-9 rounded-portal-md px-3.5 text-sm max-md:h-11",
				lg: "h-11 rounded-portal-md px-5 text-[15px]",
			},
		},
		defaultVariants: { variant: "default", size: "md" },
	}
);

export interface PortalButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof portalButtonVariants> {}

/** Portal-scoped button (primary / default / ghost x sm / md / lg), independent of the shared admin Button. */
export const PortalButton = forwardRef<HTMLButtonElement, PortalButtonProps>(
	({ className, variant, size, type = "button", ...props }, ref) => (
		<button ref={ref} type={type} className={cn(portalButtonVariants({ variant, size }), className)} {...props} />
	)
);
PortalButton.displayName = "PortalButton";
