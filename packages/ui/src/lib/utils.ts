import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const normalizeUrl = (url: string): string => {
	// If URL doesn't start with a protocol, add https://
	if (!url.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:/)) {
		return `https://${url}`;
	}
	return url;
};
