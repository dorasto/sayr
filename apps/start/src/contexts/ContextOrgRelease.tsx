"use client";

import type { schema } from "@repo/database";
import { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";

interface LayoutReleaseContextType {
	release: schema.ReleaseWithTasks | null;
	setRelease: Dispatch<SetStateAction<schema.ReleaseWithTasks | null>>;
}

const LayoutReleaseContext = createContext<LayoutReleaseContextType | undefined>(undefined);

export function useLayoutRelease() {
	const context = useContext(LayoutReleaseContext);
	if (context === undefined) {
		throw new Error("useLayoutRelease must be used within LayoutReleaseProvider");
	}
	return context;
}

/** Safe version — returns null when called outside the provider. */
export function useLayoutReleaseOptional() {
	return useContext(LayoutReleaseContext) ?? null;
}

export function LayoutReleaseProvider({
	children,
	initialRelease,
}: {
	children: React.ReactNode;
	initialRelease: schema.ReleaseWithTasks | null;
}) {
	const [release, setRelease] = useState<schema.ReleaseWithTasks | null>(initialRelease);

	return <LayoutReleaseContext.Provider value={{ release, setRelease }}>{children}</LayoutReleaseContext.Provider>;
}
