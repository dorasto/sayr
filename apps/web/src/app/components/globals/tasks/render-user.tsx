"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Label } from "@repo/ui/components/label";

interface RenderUserProps {
	name: string;
	image: string | null;
}
export default function RenderUser({ name, image }: RenderUserProps) {
	return (
		<div className="flex items-center gap-1">
			<Avatar className="h-5 w-5 rounded-full bg-primary">
				<AvatarImage src={image || "/avatar.jpg"} alt={name} />
				<AvatarFallback className="rounded-full bg-transparent uppercase">{"AA"}</AvatarFallback>
			</Avatar>
			<Label variant={"heading"} className="font-bold text-base">
				{name}
			</Label>
		</div>
	);
}
