"use client";
import { useEffect, useState } from "react";

export interface UseLocalStorageResult<T> {
	value: T;
	setValue: (newValue: T) => void;
}

export default function useLocalStorage<T>(key: string, defaultValue: T): UseLocalStorageResult<T> {
	// Initialize state from localStorage or defaultValue
	const [value, setStoredValue] = useState<T>(() => {
		if (typeof window === "undefined") return defaultValue;

		try {
			const item = window.localStorage.getItem(key);
			if (item !== null) {
				return JSON.parse(item) as T;
			} else {
				// If no item exists, store the defaultValue
				window.localStorage.setItem(key, JSON.stringify(defaultValue));
				return defaultValue;
			}
		} catch (error) {
			console.error("Failed to read from localStorage:", error);
			return defaultValue;
		}
	});

	// Listen for changes from other tabs/windows
	useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key === key && event.newValue !== null) {
				try {
					setStoredValue(JSON.parse(event.newValue));
				} catch (error) {
					console.error("Failed to parse localStorage event:", error);
				}
			}
		};

		window.addEventListener("storage", handleStorage);
		return () => {
			window.removeEventListener("storage", handleStorage);
		};
	}, [key]);

	// Update localStorage + notify other hooks in same tab
	const setValue = (newValue: T) => {
		try {
			setStoredValue(newValue);
			window.localStorage.setItem(key, JSON.stringify(newValue));

			// Dispatch a custom event so other hooks in the same tab update immediately
			window.dispatchEvent(
				new StorageEvent("storage", {
					key,
					newValue: JSON.stringify(newValue),
				})
			);
		} catch (error) {
			console.error("Failed to write to localStorage:", error);
		}
	};

	return {
		value,
		setValue,
	};
}
