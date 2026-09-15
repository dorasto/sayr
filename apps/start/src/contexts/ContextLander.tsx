import type { schema, TeamPermissions } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext } from "react";

interface ContextType {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: ContextType["tasks"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: ContextType["labels"]) => void;
	personalViews: schema.savedViewType[];
	setPersonalViews: (newValue: ContextType["personalViews"]) => void;
	categories: schema.categoryType[];
	setCategories: (newValue: ContextType["categories"]) => void;
	releases: schema.releaseType[];
	setReleases: (newValue: ContextType["releases"]) => void;
	permissionsByOrg: Record<string, TeamPermissions>;
}

const LanderContext = createContext<ContextType | undefined>(undefined);

export function RootProviderLander({
	children,
	tasks,
	labels,
	personalViews,
	categories,
	releases,
	permissionsByOrg,
}: {
	children: ReactNode;
	tasks: ContextType["tasks"];
	labels: ContextType["labels"];
	personalViews: ContextType["personalViews"];
	categories: ContextType["categories"];
	releases: ContextType["releases"];
	permissionsByOrg: ContextType["permissionsByOrg"];
}) {
	const { value: newTasks, setValue: setTasks } = useStateManagement("lander-tasks", tasks, 30000);
	const { value: newLabels, setValue: setLabels } = useStateManagement("lander-labels", labels, 30000);
	const { value: newPersonalViews, setValue: setPersonalViews } = useStateManagement(
		"lander-personal-views",
		personalViews,
		30000
	);
	const { value: newCategories, setValue: setCategories } = useStateManagement("lander-categories", categories, 30000);
	const { value: newReleases, setValue: setReleases } = useStateManagement("lander-releases", releases, 30000);

	return (
		<LanderContext.Provider
			value={{
				tasks: newTasks,
				setTasks,
				labels: newLabels,
				setLabels,
				personalViews: newPersonalViews,
				setPersonalViews,
				categories: newCategories,
				setCategories,
				releases: newReleases,
				setReleases,
				permissionsByOrg,
			}}
		>
			{children}
		</LanderContext.Provider>
	);
}

export function useLanderData() {
	const context = useContext(LanderContext);
	if (context === undefined) {
		throw new Error("useLanderData must be used within a RootProviderLander");
	}
	return context;
}
