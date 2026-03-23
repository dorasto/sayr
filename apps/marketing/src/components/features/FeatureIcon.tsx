import type { ComponentType } from "react";

interface Props {
	icon: ComponentType<{ size?: number; className?: string }>;
	size?: number;
	className?: string;
}

export function FeatureIcon({ icon: Icon, size = 32, className }: Props) {
	return <Icon size={size} className={className} />;
}
