import type { schema } from "@repo/database";
import { ComboBoxMultiResponsive } from "@repo/ui/components/tomui/combo-box-multi-responsive";
import React from "react";

export default function Labeller({
	labels,
	values,
	setValues,
}: {
	labels: schema.labelType[];
	values: string[];
	setValues: (values: string[]) => void;
}) {
	// ✅ Memoize items so they only recalc when `labels` changes
	const comboBoxItems = React.useMemo(
		() =>
			labels.map((label) => ({
				value: label.id,
				label: label.name,
			})),
		[labels]
	);

	return (
		<ComboBoxMultiResponsive
			items={comboBoxItems}
			values={values}
			onValuesChange={setValues}
			buttonText="Labels"
			maxVisible={2}
			summaryLabel={(n) => `${n} labels`}
		/>
	);
}
