"use client";

import { Button } from "../button";
import { Label } from "../label";

interface OptionFieldProps {
	title?: string;
	description?: string;
	buttonText?: React.ReactNode;
	onButtonClick?: () => void;
	customSide?: React.ReactNode;
}

export default function OptionField({
	title = "Default sadf sadf asdf asdf",
	description = "Default Description sadf asdf asdf asdf sadf sadfsadf asd fasd fasd fdsa f asdf asdf asdf asdf asdf  sadf sadf asdf asdf asdf l;kasdjf l;askdf jjslkjlskdjflskdjf",
	buttonText = "Default Button Text",
	onButtonClick,
	customSide,
}: OptionFieldProps) {
	return (
		<div className="flex items-center gap-8 w-full">
			<div className="flex flex-col gap-1">
				<Label variant={"subheading"}>{title}</Label>
				<Label variant={"description"}>{description}</Label>
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
