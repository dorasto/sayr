"use client";

import { cn } from "@repo/ui/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip";

interface InputClipboardProps {
	value: string;
	copyLabel?: string;
	copiedLabel?: string;
	showText?: boolean;
	className?: string;
	urlify?: boolean;
}

export default function InputClipboard({
	value,
	copyLabel,
	copiedLabel,
	showText,
	className,
	urlify,
}: InputClipboardProps) {
	const [copied, setCopied] = useState<boolean>(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(urlify ? `https://${value}` : value);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	if (showText)
		return (
			<div className="relative select-none">
				<div className="divide-primary-foreground/30 inline-flex divide-x rounded-md shadow-xs rtl:space-x-reverse">
					<Button
						variant={"accent"}
						className="rounded-none shadow-none first:rounded-s-md last:rounded-e-md focus-visible:z-10"
						disabled
					>
						{value}
					</Button>
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={copied ? "success" : "accent"}
									className="rounded-none shadow-none first:rounded-s-md last:rounded-e-md focus-visible:z-10"
									size="icon"
									onClick={handleCopy}
									disabled={copied}
									aria-label={copied ? copiedLabel || "Copied" : copyLabel || "Copy to clipboard"}
								>
									<div
										className={cn("transition-all", copied ? "scale-100 opacity-100" : "scale-0 opacity-0")}
									>
										<CheckIcon className="stroke-success transition-all" size={16} aria-hidden="true" />
									</div>
									<div
										className={cn(
											"absolute transition-all",
											copied ? "scale-0 opacity-0" : "scale-100 opacity-100"
										)}
									>
										<CopyIcon size={16} aria-hidden="true" />
									</div>
								</Button>
							</TooltipTrigger>
							<TooltipContent className="px-2 py-1 text-xs">
								{copied ? copiedLabel || "Copied!" : copyLabel || "Copy to clipboard"}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
		);

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={copied ? "success" : "accent"}
						className={cn(
							"rounded-none shadow-none first:rounded-s-md last:rounded-e-md focus-visible:z-10",
							className
						)}
						size="icon"
						onClick={handleCopy}
						disabled={copied}
						aria-label={copied ? copiedLabel || "Copied" : copyLabel || "Copy to clipboard"}
					>
						<div className={cn("transition-all", copied ? "scale-100 opacity-100" : "scale-0 opacity-0")}>
							<CheckIcon className="stroke-success transition-all" size={16} aria-hidden="true" />
						</div>
						<div
							className={cn("absolute transition-all", copied ? "scale-0 opacity-0" : "scale-100 opacity-100")}
						>
							<CopyIcon size={16} aria-hidden="true" />
						</div>
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">
					{copied ? copiedLabel || "Copied!" : copyLabel || "Copy to clipboard"}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
