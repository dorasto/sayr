import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import TasqIcon from "@repo/ui/components/brand-icon";
import { Button } from "@repo/ui/components/button";
import { SearchIcon } from "lucide-react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { authClient } from "@repo/auth/client";
import { IconUser } from "@tabler/icons-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@repo/ui/components/input-group";
import LoginDialog from "../auth/login";

export default function PublicNavigation() {
	const { data: session } = authClient.useSession();
	// console.log("🚀 ~ PublicNavigation ~ session:", session);

	const { organization } = usePublicOrganizationLayout();
	return (
		<header className="bg-sidebar h-(--header-height) z-50 flex w-full items-center rounded-b-xl">
			<div className="flex w-full justify-between items-center gap-2 p-3">
				<div className="flex-1 items-center gap-1 font-bold">
					<Button
						variant={"primary"}
						className="justify-start rounded-xl h-8 p-1 px-2 bg-transparent hover:bg-accent border-0"
					>
						<Avatar className="h-6 w-6 rounded-md">
							<AvatarImage src={organization.logo || ""} alt={organization.name} />
							<AvatarFallback className="rounded-md uppercase text-xs">
								<TasqIcon className="size-6! transition-all" />
							</AvatarFallback>
						</Avatar>

						<span className="text-inherit font-bold text-sm">{organization.name}</span>
					</Button>
				</div>
				<div className="flex flex-1 items-center justify-end gap-2">
					{/* Search form */}
					<div className="relative">
						<InputGroup className="bg-transparent rounded-xl border-transparent focus-within:bg-accent transition-all text-muted-foreground focus-within:text-foreground placeholder:text-muted-foreground hover:bg-accent max-w-48 h-8">
							<InputGroupInput placeholder="Search..." />
							<InputGroupAddon>
								<SearchIcon />
							</InputGroupAddon>
						</InputGroup>
					</div>
				</div>
				{session ? (
					session.user.name
				) : (
					// <Button
					//   variant={"ghost"}
					//   className="flex items-center px-2 rounded-xl h-8 p-1 px-2 bg-transparent hover:bg-accent border-0 text-muted-foreground"
					//   onClick={}
					// >
					//   <IconUser className="h-6 w-6" />
					//   Log in
					// </Button>
					<LoginDialog trigger={<Button size={"lg"}>Log in</Button>} />
				)}
			</div>
		</header>
	);
}
