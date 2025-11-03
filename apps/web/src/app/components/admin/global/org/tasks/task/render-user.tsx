"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";

interface RenderUserProps {
	name: string;
	image: string | null;
	className?: string;
	imageSize?: string;
}
export default function RenderUser({ name, image, className, imageSize = "h-5 w-5" }: RenderUserProps) {
	return (
		<div className={cn("flex items-center gap-1 text-sm", className)}>
			<Avatar className={cn(imageSize, "rounded-full bg-primary")}>
				<AvatarImage src={image || "/avatar.jpg"} alt={name} />
				<AvatarFallback className="rounded-full bg-transparent uppercase">{"AA"}</AvatarFallback>
			</Avatar>
			<Label variant={"heading"} className="font-bold text-sm">
				{name}
			</Label>
		</div>
	);
}
