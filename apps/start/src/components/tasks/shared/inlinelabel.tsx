import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";

export interface InlineLabelProps {
	text: string;
	textNode?: React.ReactNode;
	image?: string | null;
	icon?: React.ReactNode;
	className?: string;
	avatarClassName?: string;
	custom?: React.ReactNode;
}

export function InlineLabel({
	text,
	textNode,
	image,
	className,
	avatarClassName,
	icon,
	custom,
}: InlineLabelProps) {
	return custom ? (
		custom
	) : (
		<Label
			variant={"description"}
			className={cn(
				"inline-flex items-center relative text-foreground ps-5",
				className,
			)}
		>
			{(image || icon) && (
				<div className="shrink-0 absolute inset-y-0 flex items-center justify-center start-0 ps-1">
					{image && (
						<Avatar
							className={cn("rounded-full bg-primary h-3 w-3", avatarClassName)}
						>
							<AvatarImage
								src={image || "/avatar.jpg"}
								className="m-0!"
								alt={text}
							/>
							<AvatarFallback className="rounded-full bg-transparent uppercase">
								{text.slice(0, 2)}
							</AvatarFallback>
						</Avatar>
					)}
					{icon && icon}
				</div>
			)}
			<span>{textNode ?? text}</span>
		</Label>
	);
}
