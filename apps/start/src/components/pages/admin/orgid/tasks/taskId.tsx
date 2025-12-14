import { Button } from "@repo/ui/components/button";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	type ResizablePanelHandle,
} from "@repo/ui/components/resizable";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import {
	IconArrowLeft,
	IconLayoutSidebarRight,
	IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { TaskContentSideContent } from "@/components/tasks/task/task-content";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { useToastAction } from "@/lib/util";

export default function OrganizationTaskIdPage() {
	const useMobile = useIsMobile();
	const { task, setTask } = useLayoutTask();
	const { organization, labels, categories } = useLayoutOrganization();
	const { tasks, setTasks } = useLayoutTasks();
	const { runWithToast } = useToastAction();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");

	const availableUsers =
		organization?.members.map((member) => member.user) || [];

	const rawPathname = useRouterState({ select: (s) => s.location.pathname });
	const pathname =
		rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
	const ref = useRef<ResizablePanelHandle>(null);
	const [isPanelOpen, setIsPanelOpen] = useState(true);

	return (
		<div className="relative flex flex-col h-full max-h-full">
			<div className="sticky top-0 z-20 bg-background flex items-center gap-2 p-2">
				<Link to=".." search={(prev) => prev} className="">
					<Button
						variant={"ghost"}
						className="w-fit text-xs p-1 h-auto bg-accent md:bg-transparent rounded-lg"
						size={"sm"}
					>
						<IconArrowLeft className="size-3!" />
						<span className="">Back</span>
					</Button>
				</Link>
				<div></div>
				<div className="flex items-center gap-2 ml-auto">
					<Button
						variant="primary"
						className={cn("gap-2 h-6 w-fit bg-accent border-transparent p-1")}
						onClick={() => {
							if (isPanelOpen) {
								ref.current?.collapse();
							} else {
								ref.current?.expand();
							}
						}}
					>
						{isPanelOpen ? (
							<IconLayoutSidebarRightFilled />
						) : (
							<IconLayoutSidebarRight />
						)}
					</Button>
				</div>
			</div>
			<ResizablePanelGroup direction="horizontal" className="">
				<ResizablePanel defaultSize={useMobile ? 100 : 80} minSize={70}>
					<div
						className={cn(
							"flex-1 overflow-y-auto h-full flex flex-col relative",
						)}
					>
						<Outlet />
					</div>
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel
					defaultSize={20}
					minSize={20}
					maxSize={100}
					collapsible
					collapsedSize={0}
					ref={ref}
					onCollapse={() => setTimeout(() => setIsPanelOpen(false), 0)}
					onExpand={() => setTimeout(() => setIsPanelOpen(true), 0)}
					className=""
				>
					<div className="flex-1 overflow-y-auto h-full flex flex-col relative">
						{/* <div className="flex items-center gap-2 shrink-0 w-full p-2">
							<SimpleClipboard
								textToCopy={pathname}
								variant={"ghost"}
								className="size-5 ml-auto"
								copyIcon={<IconLink />}
								showTooltip={false}
							/>
							<Link
								to={`/admin/$orgId/tasks/$taskShortId`}
								params={{
									orgId: organization.id,
									taskShortId: task.shortId?.toString() || "",
								}}
								className=""
							>
								<Button size="icon" className="size-5" variant="ghost">
									<IconArrowsDiagonalMinimize2 />
								</Button>
							</Link>
						</div> */}
						<TaskContentSideContent
							task={task}
							labels={labels}
							tasks={tasks}
							setTasks={setTasks}
							setSelectedTask={(t) => t && setTask(t)}
							availableUsers={availableUsers}
							wsClientId={wsClientId}
							runWithToast={runWithToast}
							categories={categories}
						/>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
