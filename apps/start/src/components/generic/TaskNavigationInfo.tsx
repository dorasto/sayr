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
import { IconUsers } from "@tabler/icons-react";
import { Link, useMatch } from "@tanstack/react-router";
export default function TaskNavigationInfo() {
	const match = useMatch({ from: "/admin/$orgId/tasks/$taskShortId" });
	const task = match.loaderData?.task;
	const organization = match.loaderData?.task.organization;

	if (!task) return null;

	return (
		<div className="flex items-center gap-2 text-sm">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link
								to="/admin/$orgId/tasks"
								params={{ orgId: task.organizationId }}
								className=""
							>
								<Button
									variant={"ghost"}
									className="w-fit text-xs p-1 h-auto bg-accent md:bg-transparent rounded-lg"
									size={"sm"}
								>
									<Avatar className="h-4 w-4">
										<AvatarImage
											src={task.organization?.id || ""}
											alt={organization?.name}
											className=""
										/>
										<AvatarFallback className="rounded-md uppercase text-xs">
											<IconUsers className="h-4 w-4" />
										</AvatarFallback>
									</Avatar>
									<span>{organization?.name} orgname todo</span>
								</Button>
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>#{task.shortId}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
}
