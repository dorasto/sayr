"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowsDiagonalMinimize2, IconCode, IconSlash } from "@tabler/icons-react";
import Link from "next/link";
import { statusConfig } from "@/app/components/admin/global/project/shared/task-config";

export default function TaskPage() {
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: project } = useStateManagement<schema.projectType>("project", null, 1);
	const { value: task } = useStateManagement<schema.TaskWithLabels>("_task_", null, 1);
	const { value: openData = false, setValue: setOpenData } = useStateManagement<boolean>("task-open-data", false, 1);

	if (!organization || !project || !task) {
		return <Skeleton className="h-7 w-full" />;
	}

	const status = statusConfig[task.status as keyof typeof statusConfig];

	return (
		<div className="flex w-full flex-1 flex-wrap items-center shrink-0 gap-3 overflow-hidden">
			<div className="flex items-center gap-2 shrink py-0.5 h-9 shadow-xs w-fit justify-start">
				<Breadcrumb>
					<BreadcrumbList className="sm:gap-1 items-center">
						<BreadcrumbItem>
							<BreadcrumbLink href={`/admin/${organization.id}`}>{organization.name}</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />

						<BreadcrumbItem>
							<BreadcrumbLink href={`/admin/${organization.id}/${project.id}`}>{project.name}</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>#{task.shortId}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</div>
	);
}
