"use client";

import { useCallback, useRef, useState } from "react";

export interface FileWithPreview extends File {
	id: string;
	preview: string;
}

interface UseFileUploadProps {
	accept?: string;
	multiple?: boolean;
	maxSize?: number; // in bytes
	initialFiles?: FileWithPreview[];
}

interface UseFileUploadReturn {
	files: FileWithPreview[];
	isDragActive: boolean;
	openFileDialog: () => void;
	removeFile: (id: string) => void;
	clearFiles: () => void;
	getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>;
	getRootProps: () => React.HTMLAttributes<HTMLDivElement>;
	inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useFileUpload({
	accept = "*",
	multiple = false,
	maxSize = 10 * 1024 * 1024, // 10MB default
	initialFiles = [],
}: UseFileUploadProps = {}): [{ files: FileWithPreview[]; isDragActive: boolean }, UseFileUploadReturn] {
	const [files, setFiles] = useState<FileWithPreview[]>(initialFiles);
	const [isDragActive, setIsDragActive] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const generateFileId = useCallback(() => Math.random().toString(36).substring(2, 15), []);

	const createFileWithPreview = useCallback(
		(file: File): FileWithPreview => {
			const id = generateFileId();
			const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";

			return Object.assign(file, {
				id,
				preview,
			});
		},
		[generateFileId]
	);

	const validateFile = useCallback(
		(file: File): boolean => {
			if (file.size > maxSize) {
				console.warn(`File ${file.name} is too large. Maximum size is ${maxSize} bytes.`);
				return false;
			}
			return true;
		},
		[maxSize]
	);

	const processFiles = useCallback(
		(fileList: FileList | File[]) => {
			const validFiles = Array.from(fileList).filter(validateFile).map(createFileWithPreview);

			if (multiple) {
				setFiles((prev) => [...prev, ...validFiles]);
			} else {
				// Clean up previous preview URLs
				files.forEach((file) => {
					if (file.preview) {
						URL.revokeObjectURL(file.preview);
					}
				});
				setFiles(validFiles);
			}
		},
		[multiple, validateFile, createFileWithPreview, files]
	);

	const openFileDialog = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const removeFile = useCallback((id: string) => {
		setFiles((prev) => {
			const fileToRemove = prev.find((f) => f.id === id);
			if (fileToRemove?.preview) {
				URL.revokeObjectURL(fileToRemove.preview);
			}
			return prev.filter((f) => f.id !== id);
		});
	}, []);

	const clearFiles = useCallback(() => {
		files.forEach((file) => {
			if (file.preview) {
				URL.revokeObjectURL(file.preview);
			}
		});
		setFiles([]);
	}, [files]);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const { files: fileList } = e.target;
			if (fileList) {
				processFiles(fileList);
			}
		},
		[processFiles]
	);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragActive(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragActive(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragActive(false);

			const { files: fileList } = e.dataTransfer;
			if (fileList) {
				processFiles(fileList);
			}
		},
		[processFiles]
	);

	const getInputProps = useCallback(
		(): React.InputHTMLAttributes<HTMLInputElement> => ({
			type: "file",
			accept,
			multiple,
			onChange: handleFileChange,
			style: { display: "none" },
		}),
		[accept, multiple, handleFileChange]
	);

	const getRootProps = useCallback(
		(): React.HTMLAttributes<HTMLDivElement> => ({
			onDragOver: handleDragOver,
			onDragLeave: handleDragLeave,
			onDrop: handleDrop,
		}),
		[handleDragOver, handleDragLeave, handleDrop]
	);

	const returnValue: UseFileUploadReturn = {
		files,
		isDragActive,
		openFileDialog,
		removeFile,
		clearFiles,
		getInputProps,
		getRootProps,
		inputRef,
	};

	return [{ files, isDragActive }, returnValue];
}
