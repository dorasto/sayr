"use client";

import { ChevronRight } from "lucide-react";
import { Badge } from "../badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../collapsible";

interface JsonViewerProps {
	data: unknown;
	name?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export const JsonViewer = ({ data, name = "root", open, onOpenChange }: JsonViewerProps) => {
	const renderValue = (value: unknown, key: string, level = 0) => {
		// Handle null/undefined
		if (value === null || value === undefined) {
			return (
				<div className="flex items-center gap-2 py-2 w-full text-left data-[state=open]:[&_svg]:rotate-90 hover:bg-muted p-2 data-[state=open]:hover:bg-muted data-[state=open]:bg-accent">
					<span className="font-mono text-sm">{key}:</span>
					<span className="italic">{value === null ? "null" : "undefined"}</span>
				</div>
			);
		}

		// Handle primitives (string, number, boolean)
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			return (
				<div className="flex items-center gap-2 py-2 w-full text-left data-[state=open]:[&_svg]:rotate-90 hover:bg-muted p-2 data-[state=open]:hover:bg-muted data-[state=open]:bg-accent">
					<span className="font-mono text-sm">{key}:</span>
					<span
						className={`font-mono text-sm ${
							typeof value === "string"
								? "text-green-400"
								: typeof value === "number"
									? "text-yellow-400"
									: "text-purple-400"
						}`}
					>
						{typeof value === "string" ? `"${value}"` : String(value)}
					</span>
				</div>
			);
		}

		// Handle Date objects
		if (value instanceof Date) {
			return (
				<div className="flex items-center gap-2 py-2 w-full text-left data-[state=open]:[&_svg]:rotate-90 hover:bg-muted p-2 data-[state=open]:hover:bg-muted data-[state=open]:bg-accent">
					<span className="font-mono text-sm">{key}:</span>
					<span className="text-orange-400 font-mono text-sm">"{value.toISOString()}"</span>
				</div>
			);
		}

		// Handle arrays
		if (Array.isArray(value)) {
			if (value.length === 0) {
				return (
					<div className="flex items-center gap-2 py-2 w-full text-left data-[state=open]:[&_svg]:rotate-90 hover:bg-muted p-2 data-[state=open]:hover:bg-muted data-[state=open]:bg-accent">
						<span className="font-mono text-sm">{key}:</span>
						<span className="">[]</span>
					</div>
				);
			}

			return (
				<Collapsible className="border-b border-slate-700">
					<CollapsibleTrigger className="flex items-center gap-2 py-2 w-full text-left data-[state=open]:[&_svg]:rotate-90 hover:bg-muted p-2 data-[state=open]:hover:bg-muted data-[state=open]:bg-accent">
						<span className="font-mono text-sm">{key}:</span>
						<Badge variant="outline" className="text-xs">
							Array[{value.length}]
						</Badge>
						<ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 [&[data-state=open]]:rotate-90 ml-auto" />
					</CollapsibleTrigger>
					<CollapsibleContent className="pl-6 border-l border-slate-700 ml-2 pb-2">
						{value.map((item, index) => {
							// Create a more unique key based on content if possible
							const uniqueKey =
								typeof item === "object" && item !== null && "id" in item
									? `${key}-${item.id}`
									: `${key}-${index}-${JSON.stringify(item).slice(0, 50)}`;
							return (
								<div key={uniqueKey} className="mb-2">
									{renderValue(item, `[${index}]`, level + 1)}
								</div>
							);
						})}
					</CollapsibleContent>
				</Collapsible>
			);
		}

		// Handle objects
		if (typeof value === "object" && value !== null) {
			const entries = Object.entries(value);
			if (entries.length === 0) {
				return (
					<div className="flex items-center gap-2 py-1">
						<span className="text-blue-400 font-mono text-sm">{key}:</span>
						<span className="text-gray-500">{"{}"}</span>
					</div>
				);
			}

			return (
				<Collapsible className="group/collapse">
					<CollapsibleTrigger className="flex items-center gap-2 py-2 w-full text-left data-[state=open]:[&_svg]:rotate-90 hover:bg-muted p-2 data-[state=open]:hover:bg-muted data-[state=open]:bg-accent">
						<span className="font-mono">{key}:</span>
						<Badge variant="outline">Object({entries.length})</Badge>
						<ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 ml-auto" />
					</CollapsibleTrigger>
					<CollapsibleContent className="pl-6 bg-accent">
						{entries.map(([subKey, subValue]) => (
							<div key={subKey} className="mb-2">
								{renderValue(subValue, subKey, level + 1)}
							</div>
						))}
					</CollapsibleContent>
				</Collapsible>
			);
		}

		// Fallback for unknown types
		return (
			<div className="flex items-center gap-2 py-2 w-full text-left data-[state=open]:[&_svg]:rotate-90 hover:bg-muted p-2 data-[state=open]:hover:bg-muted data-[state=open]:bg-accent">
				<span className="font-mono text-sm">{key}:</span>
				<span className="font-mono text-sm">{String(value)}</span>
			</div>
		);
	};

	return (
		<Collapsible open={open} onOpenChange={onOpenChange}>
			{/* <CollapsibleTrigger>Data</CollapsibleTrigger> */}
			<CollapsibleContent>
				<div className="bg-background rounded border p-4 max-h-[80dvh] overflow-auto">
					<div className="w-full space-y-1">
						{typeof data === "object" && data !== null && !Array.isArray(data) ? (
							Object.entries(data).map(([key, value]) => <div key={key}>{renderValue(value, key, 0)}</div>)
						) : (
							<div>{renderValue(data, name, 0)}</div>
						)}
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
};
