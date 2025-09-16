"use client";
import LabelledInput from "@repo/ui/components/tomui/labeled-input";
export default function ProfileUpdate() {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex gap-3">
				<LabelledInput id="display-name" label="Display name" />
			</div>
		</div>
	);
}
