import { ComboBoxMultiResponsive } from "@repo/ui/components/tomui/combo-box-multi-responsive";
import React from "react";
import { useLayoutOrganization } from "@/app/admin/[organization_id]/Context";

export default function Labeller({ values, setValues }: { values: string[]; setValues: (values: string[]) => void }) {
	const { labels } = useLayoutOrganization();
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
