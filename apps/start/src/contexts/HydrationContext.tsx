"use client";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface HydrationContextType {
	isHydrated: boolean;
}

const HydrationContext = createContext<HydrationContextType>({ isHydrated: false });

/**
 * Provider that tracks when the app has completed hydration.
 * Place this at the root of your app (in __root.tsx or router).
 *
 * Components can use `useHydration()` to check if hydration is complete
 * before rendering content that might differ between server and client.
 */
export function HydrationProvider({ children }: { children: ReactNode }) {
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	return <HydrationContext.Provider value={{ isHydrated }}>{children}</HydrationContext.Provider>;
}

/**
 * Hook to check if the app has completed hydration.
 * Use this to conditionally render content that depends on client-only state.
 */
export function useHydration() {
	return useContext(HydrationContext);
}
