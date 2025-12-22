"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import TasqIcon from "@repo/ui/components/brand-icon";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { SearchIcon } from "lucide-react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { authClient } from "@repo/auth/client";

export default function PublicNavigation() {
	const { data: session } = authClient.useSession();
	console.log("🚀 ~ PublicNavigation ~ session:", session);

	const { organization } = usePublicOrganizationLayout();
	return (
		<header className="bg-sidebar h-(--header-height) sticky top-0 z-50 flex w-full items-center rounded-b-2xl">
			<div className="flex w-full justify-between items-center gap-2 p-1">
				<div className="flex-1 items-center gap-1 font-bold">
					<Button variant={"ghost"} className="justify-start px-2">
						<Avatar className="h-8 w-8 rounded-md">
							<AvatarImage src={organization.logo || ""} alt={organization.name} />
							<AvatarFallback className="rounded-md uppercase text-xs">
								<TasqIcon className="size-8! transition-all" />
							</AvatarFallback>
						</Avatar>

						<span className="text-inherit font-bold text-lg">{organization.name}</span>
					</Button>
				</div>
				<div className="grow max-sm:hidden">
					{/* Search form */}
					<div className="relative mx-auto w-full max-w-xs">
						<Input id={"search"} className="peer h-8 px-8" placeholder="Search..." type="search" />
						<div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 peer-disabled:opacity-50">
							<SearchIcon size={16} />
						</div>
					</div>
				</div>
				<div className="flex flex-1 items-center justify-end gap-2">
					{session ? session.user.name : <Button>Sign in</Button>}
				</div>
			</div>
		</header>
	);
}
