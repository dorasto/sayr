"use client";

import { useCallback, useState } from "react";

interface UseCharacterLimitProps {
	maxLength: number;
	initialValue?: string;
}

interface UseCharacterLimitReturn {
	value: string;
	characterCount: number;
	maxLength: number;
	handleChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
	setValue: (value: string) => void;
	remainingCharacters: number;
	isAtLimit: boolean;
}

export function useCharacterLimit({ maxLength, initialValue = "" }: UseCharacterLimitProps): UseCharacterLimitReturn {
	const [value, setValue] = useState(initialValue);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
			const newValue = e.target.value;
			if (newValue.length <= maxLength) {
				setValue(newValue);
			}
		},
		[maxLength]
	);

	const characterCount = value.length;
	const remainingCharacters = maxLength - characterCount;
	const isAtLimit = characterCount >= maxLength;

	return {
		value,
		characterCount,
		maxLength,
		handleChange,
		setValue,
		remainingCharacters,
		isAtLimit,
	};
}
