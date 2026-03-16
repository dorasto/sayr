import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import useServerEvents from "@/lib/serverEvents";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { WSMessage } from "@/lib/ws";

interface ContextType {
	organization: schema.OrganizationWithMembers;
	serverEvents: ReturnType<typeof useServerEvents>;
	setOrganization: (newVaule: ContextType["organization"]) => void;
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: ContextType["tasks"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: ContextType["labels"]) => void;
	categories: schema.categoryType[];
	setCategories: (newValue: ContextType["categories"]) => void;
	issueTemplates: schema.issueTemplateWithRelations[];
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function PublicOrganizationProvider({
	children,
	organization,
	labels,
	categories,
	issueTemplates,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	labels: ContextType["labels"];
	categories: ContextType["categories"];
	issueTemplates: ContextType["issueTemplates"];
}) {
	const { value: NewOrganization, setValue: setOrganization } = useStateManagement("organization", organization);
	const { value: NewTasks, setValue: setTasks } = useStateManagement<schema.TaskWithLabels[]>("tasks", []);
	const { value: NewLabels, setValue: setLabels } = useStateManagement("labels", labels);
	const { value: NewCategories, setValue: setCategories } = useStateManagement("categories", categories);
	const serverEvents = useServerEvents(organization.id);

	useEffect(() => setLabels(labels), [labels, setLabels]);
	useEffect(() => setCategories(categories), [categories, setCategories]);
	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_ORG: (msg) => {
			setOrganization({ ...organization, ...msg.data });
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE PublicOrganizationProvider]", { msg }),
	});
	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);
	return (
		<RootContext.Provider
			value={{
				organization: NewOrganization,
				serverEvents,
				setOrganization,
				tasks: NewTasks,
				setTasks,
				labels: NewLabels,
				setLabels,
				categories: NewCategories,
				setCategories,
				issueTemplates,
			}}
		>
			{children}
		</RootContext.Provider>
	);
}

export function usePublicOrganizationLayout() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("usePublicOrganizationLayout must be used within a PublicOrganizationProvider");
	}
	return context;
}
