import { ComboBoxMultiResponsive } from "@repo/ui/components/tomui/combo-box-multi-responsive";
import React from "react";

const labels = [
	{ value: "bug", label: "Bug" },
	{ value: "feature", label: "Feature request" },
	{ value: "doc", label: "Documentation" },
	{ value: "enhancement", label: "Enhancement" },
	{ value: "help wanted", label: "Help wanted" },
	{ value: "question", label: "Question" },
];

export default function Labeller() {
	const [values, setValues] = React.useState<string[]>([]);

	return (
		<ComboBoxMultiResponsive
			items={labels}
			values={values}
			onValuesChange={setValues}
			buttonText="Labels"
			maxVisible={2}
			summaryLabel={(n) => `${n} labels`}
		/>
	);
}
