import * as React from "react";

interface AspectRatioProps extends React.ComponentPropsWithoutRef<"div"> {
	ratio?: number;
}

const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(({ style, ratio = 1 / 1, ...props }, ref) => (
	<div ref={ref} style={{ aspectRatio: ratio, ...style }} {...props} />
));
AspectRatio.displayName = "AspectRatio";

export { AspectRatio };
