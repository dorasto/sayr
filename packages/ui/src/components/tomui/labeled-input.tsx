"use client";

import { cn } from "@repo/ui/lib/utils";
import { Input } from "../input";
import { Label } from "../label";

interface LabelledInputProps {
	id?: string;
	value?: string;
	setValue?: (value: string) => void;
	label: string;
	className?: string;
	labelClassName?: string;
	inputClassName?: string;
}
export default function LabelledInput({
	id,
	value,
	setValue,
	label,
	className,
	labelClassName,
	inputClassName,
}: LabelledInputProps) {
	return (
		<div className={cn("group relative", className)}>
			<Label
				htmlFor={id}
				className="origin-start text-muted-foreground/70 group-focus-within:text-foreground has-[+input:not(:placeholder-shown)]:text-foreground absolute top-1/2 block -translate-y-1/2 cursor-text px-1 text-sm transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-xs has-[+input:not(:placeholder-shown)]:font-medium"
			>
				<span className={cn("bg-popover inline-flex px-2", labelClassName)}>{label}</span>
			</Label>
			<Input
				id={id}
				type="text"
				placeholder=" "
				value={value}
				onChange={(e) => setValue?.(e.target.value)}
				required
				className={cn("bg-popover", inputClassName)}
			/>
		</div>
	);
}
