"use client";

import { Button } from "../button";
import { Label } from "../label";

interface OptionFieldProps {
	title?: string;
	description?: string;
	buttonText?: React.ReactNode;
	onButtonClick?: () => void;
	customSide?: React.ReactNode;
	icon?: React.ReactNode;
}

export default function OptionField({
	title = "Default sadf sadf asdf asdf",
	description,
	buttonText = "Default Button Text",
	onButtonClick,
	customSide,
	icon,
}: OptionFieldProps) {
	return (
		<div className="flex items-center gap-8 w-full">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					{icon && icon}
					<Label variant={"subheading"}>{title}</Label>
				</div>
				{description && <Label variant={"description"}>{description}</Label>}
			</div>
			<div className="ml-auto">
				{customSide || (
					<Button variant={"outline"} className="cursor-pointer" onClick={onButtonClick}>
						<Label className="cursor-pointer">{buttonText}</Label>
					</Button>
				)}
			</div>
		</div>
	);
}
