"use client";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@repo/ui/components/input-group";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import * as tabler from "@tabler/icons-react";
import { IconSearch } from "@tabler/icons-react";
import { type JSX, useEffect, useState } from "react";
import RenderIcon from "./RenderIcon";

const EXCLUDED_KEYS = ["createReactComponent", "iconsList", "icons"];

// Build list of all icons once
const iconsAll = Object.entries(tabler)
	.filter(([iconName]) => !EXCLUDED_KEYS.includes(iconName))
	.map(([iconName]) => ({
		value: iconName,
		icon: <RenderIcon iconName={iconName} size={60} raw />,
	}));

interface Props {
	value: string;
	update: (value: string) => void;
}

export default function IconPicker({ value, update }: Props) {
	const [icons, setIcons] = useState(iconsAll.filter((e) => e.value.includes("Brand")).slice(0, 50));

	const [selectedIcon, setSelectedIcon] = useState<{
		icon: JSX.Element | string;
		value: string;
	}>({
		icon: "",
		value: "",
	});

	// When "value" changes, update the selected icon visually
	useEffect(() => {
		setSelectedIcon({
			icon: <RenderIcon iconName={value} size={60} raw />,
			value,
		});
	}, [value]);

	const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
		const searchText = (e.target as HTMLInputElement).value.toLowerCase();
		const searchTokens = searchText.split(" ").filter((t) => t.trim() !== "");

		if (!searchText) {
			setIcons(iconsAll.filter((e) => e.value.includes("Brand")).slice(0, 50));
			return;
		}

		const filteredIcons = iconsAll.filter((icon) => {
			const normalized = icon.value.toLowerCase();
			return searchTokens.every((token) => normalized.includes(token));
		});

		setIcons(filteredIcons.slice(0, 50));
	};

	return (
		<Card className="border-none bg-transparent">
			<div className="w-full">
				<InputGroup className="h-auto bg-accent border-transparent">
					<InputGroupInput
						onKeyUp={handleSearch}
						className="placeholder:text-muted-foreground"
						placeholder="Search over 5000 icons..."
					/>
					<InputGroupAddon>
						<IconSearch />
					</InputGroupAddon>
					<InputGroupAddon align="inline-end">
						<a href="https://tabler.io/icons?utm_source=sayr.io">
							<Button className="p-1 h-auto bg-[#1E69C3] hover:bg-[#1E69C3]/80 text-xs" size={"sm"}>
								<tabler.IconBrandTablerFilled className="" /> tabler.io
							</Button>
						</a>
					</InputGroupAddon>
				</InputGroup>
				{/* <div className="flex items-center gap-1 rounded-t-md bg-muted pl-2 pr-2">
					<IconSearch size={18} />
					<Input
						type="text"
						variant="ghost"
						className="border-b-navigationAccent placeholder:text-copy-light w-full bg-muted"
						placeholder="Search over 5000 icons..."
						onKeyUp={handleSearch}
					/>
				</div> */}
				<ScrollArea className="h-72 w-full rounded-md border-2 border-muted bg-card px-3">
					<div className="grid grid-cols-2 gap-3 py-3 md:grid-cols-4">
						{/* {selectedIcon.icon && selectedIcon.value && (
							<button
								type="button"
								className="icons-tooltip text-light-copy size-16 text-copy rounded-xl border-2 bg-primary text-3xl"
								onClick={() => update("")}
							>
								{selectedIcon.icon}
							</button>
						)} */}

						{icons.map((icon, index) => (
							<button
								type="button"
								// biome-ignore lint/suspicious/noArrayIndexKey: <key>
								key={index}
								className={cn(
									"icons-tooltip text-light-copy size-16 text-copy rounded-xl border-2 bg-accent text-3xl",
									selectedIcon.value === icon.value && "border-primary"
								)}
								onClick={() => update(icon.value)}
							>
								{icon.icon}
							</button>
						))}
					</div>
				</ScrollArea>
			</div>
		</Card>
	);
}
