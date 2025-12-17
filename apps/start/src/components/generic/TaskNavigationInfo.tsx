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
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import { ensureCdnUrl } from "@repo/util";
import { IconSlash, IconUsers } from "@tabler/icons-react";
import { Link, useMatch } from "@tanstack/react-router";

export default function TaskNavigationInfo() {
	// Get organization from parent route (same pattern as TasksPageNavigationInfo)
	const orgMatch = useMatch({ from: "/admin/$orgId", shouldThrow: false });
	const organization = orgMatch?.loaderData?.organization;

	// Get task from the task detail route
	const taskMatch = useMatch({
		from: "/admin/$orgId/tasks/$taskShortId",
		shouldThrow: false,
	});
	const task = taskMatch?.loaderData?.task;

	if (!task || !organization) return null;

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
					<BreadcrumbSeparator>
						<IconSlash />
					</BreadcrumbSeparator>
					<BreadcrumbItem>
						<BreadcrumbPage>#{task.shortId}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
}
