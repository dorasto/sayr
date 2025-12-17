import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import { ensureCdnUrl } from "@repo/util";
import { IconUsers } from "@tabler/icons-react";
import { Link, useMatch } from "@tanstack/react-router";
import TasksPageActions from "./TasksPageActions";

export default function TasksPageNavigationInfo() {
	// Use route match to get organization data instead of context
	// This avoids the context provider requirement at the AdminNavigation level
	const match = useMatch({ from: "/admin/$orgId", shouldThrow: false });
	const organization = match?.loaderData?.organization;

	if (!organization) return null;

	return (
		<div className="flex items-center gap-2 text-sm">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link
								to="/admin/$orgId/tasks"
								params={{ orgId: organization.id }}
								className=""
							>
								<Button
									variant={"primary"}
									className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
									size={"sm"}
								>
									<Avatar className="h-4 w-4">
										<AvatarImage
											src={
												organization.logo ? ensureCdnUrl(organization.logo) : ""
											}
											alt={organization.name}
											className=""
										/>
										<AvatarFallback className="rounded-md uppercase text-xs">
											<IconUsers className="h-4 w-4" />
										</AvatarFallback>
									</Avatar>
									<span>{organization.name}</span>
								</Button>
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<TasksPageActions />
						</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
}
