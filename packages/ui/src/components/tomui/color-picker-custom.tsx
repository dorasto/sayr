import { type HsvaColor, hexToHsva, hsvaToHex, hsvaToHsla } from "@uiw/color-convert";
import Alpha from "@uiw/react-color-alpha";
import Hue from "@uiw/react-color-hue";
import Saturation from "@uiw/react-color-saturation";
import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import "./color-picker-custom.css";

type ColorValue = HsvaColor;

// Helper function to convert HSVA to HSLA string format
const hsvaToHslaString = (hsva: ColorValue): string => {
	const hsla = hsvaToHsla(hsva);
	return `hsla(${Math.round(hsla.h)}, ${Math.round(hsla.s)}%, ${Math.round(hsla.l)}%, ${hsla.a})`;
};

type Props = {
	/** Whether to allow alpha (transparency) adjustment */
	allowAlpha?: boolean;
	/** Initial color value as hex string (e.g., "#ff0000" or "#ff0000ff" with alpha) */
	defaultValue?: string;
	/** Controlled color value as hex string */
	value?: string;
	/**
	 * Callback fired when the color value changes.
	 * @param hsla Color in HSLA format (e.g. "hsla(120, 50%, 50%, 0.8)").
	 * @param hex  Color in HEX format (e.g. "#00ff00").
	 */
	onChange?: ({ hsla, hex }: { hsla: string; hex: string }) => void;
	/** Custom className for the container */
	className?: string;
	/** Show debug info for development (displays the saved color value) */
	showDebugInfo?: boolean;
	height?: number;
};

// Custom pointer for Saturation component
const SaturationPointer = ({ style, color, ...props }: React.HTMLAttributes<HTMLDivElement> & { color: string }) => {
	return (
		<div
			{...props}
			style={{
				position: "absolute",
				width: 20,
				height: 20,
				borderRadius: "50%",
				border: "3px solid #fff",
				boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(0, 0, 0, 0.1)",
				transform: "translate(-10px, -10px)",
				...style,
			}}
		>
			<div
				style={{
					backgroundColor: color,
					borderRadius: "50%",
					height: "100%",
					width: "100%",
				}}
			/>
		</div>
	);
};

// Custom pointer for Hue/Alpha sliders
const SliderPointer = ({ left, top, color }: { left?: string; top?: string; color: string }) => {
	return (
		<div
			style={{
				position: "absolute",
				left: left || "50%",
				top: top || "50%",
				width: left ? 4 : 12, // 4px line for horizontal, 12px (match slider width) for vertical
				height: left ? 12 : 4, // 12px for horizontal, 4px line for vertical
				borderRadius: "2px",
				border: "2px solid #fff",
				boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
				transform: left ? "translate(-50%, -6px)" : "translate(-6px, -50%)",
				backgroundColor: color,
			}}
		/>
	);
};

export default function ColorPickerCustom({
	allowAlpha = false,
	defaultValue = "#444444",
	value,
	onChange,
	className,
	showDebugInfo = false,
	height = 150,
}: Props) {
	const [hsva, setHsva] = useState<ColorValue>(() => {
		const initialValue = value || defaultValue;
		try {
			return hexToHsva(initialValue);
		} catch {
			return { h: 0, s: 0, v: 68, a: 1 };
		}
	});

	// Update internal state when controlled value changes
	useEffect(() => {
		if (value) {
			try {
				const newHsva = hexToHsva(value);
				setHsva(newHsva);
			} catch {
				// Invalid hex value, ignore
			}
		}
	}, [value]);

	const handleChange = (newHsva: ColorValue) => {
		// If alpha is not allowed, force it to 1
		const finalHsva = allowAlpha ? newHsva : { ...newHsva, a: 1 };

		setHsva(finalHsva);

		// Call onChange with HSLA string and hex
		const hslaValue = hsvaToHslaString(finalHsva);
		const hexValue = hsvaToHex(finalHsva);
		onChange?.({ hsla: hslaValue, hex: hexValue });
	};

	const displayHsva = allowAlpha ? hsva : { ...hsva, a: 1 };

	return (
		<div className={cn("flex gap-3 w-full min-w-full", className)}>
			{/* Main saturation picker */}
			<div className="flex-1 w-full color-picker-saturation">
				<Saturation
					hsva={displayHsva}
					onChange={(newColor: HsvaColor) => handleChange({ ...displayHsva, ...newColor })}
					style={{
						width: "100%",
						height: height,
						borderRadius: "8px",
						overflow: "hidden",
					}}
					radius="8px"
					pointer={({ left, top }) => <SaturationPointer style={{ left, top }} color={hsvaToHex(displayHsva)} />}
				/>
			</div>

			{/* Vertical hue and alpha sliders */}
			<div className="flex flex-col gap-2 color-picker-hue">
				<Hue
					hue={displayHsva.h}
					direction="vertical"
					onChange={(newHue: { h: number }) => handleChange({ ...displayHsva, ...newHue })}
					style={{
						width: 12,
						height: height,
						borderRadius: "6px",
						overflow: "visible",
					}}
					radius="6px"
					bgProps={{
						style: {
							borderRadius: "6px",
						},
					}}
					innerProps={{
						style: {
							borderRadius: "6px",
						},
					}}
					pointer={({ top }) => <SliderPointer top={top} color={`hsl(${displayHsva.h}deg 100% 50%)`} />}
				/>

				{allowAlpha && (
					<Alpha
						hsva={displayHsva}
						direction="vertical"
						onChange={(newAlpha: { a: number }) => handleChange({ ...displayHsva, ...newAlpha })}
						style={{
							width: 20,
							height: 20,
							borderRadius: "50%",
						}}
						pointer={() => <div />} // Hide pointer for this compact view
						bgProps={{
							style: {
								borderRadius: "50%",
							},
						}}
						innerProps={{
							style: {
								borderRadius: "50%",
								border: "2px solid #fff",
								boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
							},
						}}
					/>
				)}
			</div>

			{showDebugInfo && (
				<div className="absolute top-0 right-0 font-mono text-xs bg-accent px-2 py-1 rounded">
					{hsvaToHslaString(displayHsva)}
				</div>
			)}
		</div>
	);
}
