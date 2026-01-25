import { headlessToast } from "@repo/ui/components/headless-toast";

export interface FileValidationResult {
	valid: boolean;
	error?: string;
}

export const validateImageFile = (file: File): FileValidationResult => {
	if (!file.type.startsWith("image/")) {
		return { valid: false, error: "Please select an image file" };
	}
	if (file.size > 10 * 1024 * 1024) {
		// 10MB limit
		return { valid: false, error: "File size must be less than 10MB" };
	}
	return { valid: true };
};

export const handleFileValidation = (file: File): boolean => {
	const validation = validateImageFile(file);
	if (!validation.valid && validation.error) {
		headlessToast.error({ title: validation.error });
		return false;
	}
	return true;
};
