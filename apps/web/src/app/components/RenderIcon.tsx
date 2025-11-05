import * as tabler from "@tabler/icons-react";

const RenderIcon = ({
	iconName,
	size,
	raw,
	color,
}: {
	iconName: string;
	size?: number;
	raw?: boolean;
	color?: string;
}) => {
	try {
		if (iconName.startsWith("Icon")) {
			//@ts-expect-error
			const IconComponent = tabler[iconName];
			// Ensure it's a valid React component (function or forwardRef)
			if (
				typeof IconComponent === "function" ||
				(typeof IconComponent === "object" && IconComponent?.$$typeof === Symbol.for("react.forward_ref"))
			) {
				if (raw) {
					return <IconComponent size={size || 60} color={color} />;
				}
				return (
					<div className={"absolute left-4 top-1/2 -translate-y-1/2 transform"}>
						<IconComponent size={size || 60} color={color} />
					</div>
				);
			} else {
				console.warn(`Skipping invalid component: ${iconName}`, IconComponent);
				return null;
			}
		}
	} catch (error) {
		console.error(`Error rendering icon "${iconName}":`, error);
		return null;
	}
};
export default RenderIcon;
