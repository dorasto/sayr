import { closestCenter, DndContext, type DragEndEvent, DragOverlay, MeasuringStrategy } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { IconUsers } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import { reorderOrganizationsAction } from "@/lib/serverFunctions/reorderOrganizations";
import OrgSection from "./primary-org";
import { reorderIds, useSidebarSortSensors } from "./sortable-sidebar";

/**
 * The primary sidebar's organizations, drag-to-reorder (SAY-104). The order is the user's own, saved on their
 * memberships (`member.position`) and returned by getOrganizations, so everything else reading
 * `useLayoutData().organizations` (Cmd+K switcher, settings sidebar, pickers, /home's group-by-org) follows it.
 * Optimistic: the list moves at once and rolls back if saving fails. `children` render after the sortable rows
 * (the "Create" row), outside the sortable set so it always stays last.
 */
export function OrgSortableList({
	closeMobileSidebar,
	children,
}: {
	closeMobileSidebar: () => void;
	children?: ReactNode;
}) {
	const { organizations, setOrganizations } = useLayoutData();
	const sensors = useSidebarSortSensors();
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const draggingOrg = organizations.find((org) => org.id === draggingId);

	const handleDragEnd = async (event: DragEndEvent) => {
		setDraggingId(null);
		const orderedIds = reorderIds(
			organizations.map((org) => org.id),
			event.active.id,
			event.over?.id
		);
		if (!orderedIds) return;
		const previous = organizations;
		const byId = new Map(organizations.map((org) => [org.id, org]));
		setOrganizations(orderedIds.flatMap((id) => byId.get(id) ?? []));
		try {
			await reorderOrganizationsAction({ data: { orderedOrgIds: orderedIds } });
		} catch {
			setOrganizations(previous);
			headlessToast({ title: "Couldn't save the organization order", variant: "error" });
		}
	};

	return (
		// Expanded orgs fold as a drag starts (OrgSection), so the rows are re-measured throughout the drag.
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
			onDragStart={(event) => setDraggingId(String(event.active.id))}
			onDragEnd={handleDragEnd}
			onDragCancel={() => setDraggingId(null)}
		>
			<SortableContext items={organizations.map((org) => org.id)} strategy={verticalListSortingStrategy}>
				{organizations.map((org) => (
					<OrgSection key={org.id} organization={org} closeMobileSidebar={closeMobileSidebar} />
				))}
			</SortableContext>
			{children}
			{/* The lifted row under the pointer; the org's own section stays in the list as a faded placeholder. */}
			<DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
				{draggingOrg && (
					<div className="flex h-8 cursor-grabbing items-center gap-3 rounded-lg border bg-card px-2 text-sm shadow-lg">
						<Avatar className="size-4 rounded-md bg-accent">
							<AvatarImage src={draggingOrg.logo || ""} alt={draggingOrg.name} />
							<AvatarFallback className="rounded-md">
								<IconUsers className="size-4" />
							</AvatarFallback>
						</Avatar>
						<span className="truncate">{draggingOrg.name}</span>
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}
