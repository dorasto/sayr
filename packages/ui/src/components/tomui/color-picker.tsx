import { hexToHsva, hsvaToHex, hsvaToHsla } from "@uiw/color-convert";
import Colorful from "@uiw/react-color-colorful";
import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { Input } from "../input";

type ColorValue = {
	h: number;
	s: number;
	v: number;
	a: number;
};

export function hslaStringToHex(hslaString: string): string {
	const match = hslaString.replace(/\s+/g, "").match(/^hsla?\((\d+),(\d+)%?,(\d+)%?,?([\d.]+)?\)$/i);
	if (!match) return hslaString;
	const h = parseInt(match[1] ?? "", 10);
	const s = parseInt(match[2] ?? "", 10);
	const l = parseInt(match[3] ?? "", 10);
	const a = match[4] !== undefined ? parseFloat(match[4] ?? "1") : 1;
	// Convert HSL → HSV
	const lFrac = l / 100;
	const sFrac = s / 100;
	const v = lFrac + sFrac * Math.min(lFrac, 1 - lFrac);
	const sv = v === 0 ? 0 : 2 * (1 - lFrac / v);

	const hsva = {
		h,
		s: Math.round(sv * 100),
		v: Math.round(v * 100),
		a,
	};
	return hsvaToHex(hsva);
}

// Helper function to convert HSVA to HSLA string format
const hsvaToHslaString = (hsva: ColorValue): string => {
	const hsla = hsvaToHsla(hsva);
	return `hsla(${Math.round(hsla.h)}, ${Math.round(hsla.s)}%, ${Math.round(hsla.l)}%, ${hsla.a})`;
};

type Props = {
	/** Whether to allow alpha (transparency) adjustment */
	allowAlpha?: boolean;
	/** Whether to show the hex input field */
	showHexInput?: boolean;
	/** Initial color value as hex string (e.g., "#ff0000" or "#ff0000ff" with alpha) */
	defaultValue?: string;
	/** Controlled color value as hex string */
	value?: string;
	/** Callback when color changes - returns HSLA string like "hsla(120, 50%, 50%, 0.8)" */
	onChange?: (hsla: string) => void;
	/** Custom className for the container */
	className?: string;
	/** Custom className for the color picker */
	colorPickerClassName?: string;
	/** Placeholder text for hex input */
	hexInputPlaceholder?: string;
	/** Whether the hex input is disabled */
	hexInputDisabled?: boolean;
	/** Show debug info for development (displays the saved color value) */
	showDebugInfo?: boolean;
	/** Whether to show the default color palette */
	showDefaultColors?: boolean;
	/** Array of predefined colors (hex format) that users can quickly select */
	defaultColors?: string[];
	/** Custom className for the default colors container */
	defaultColorsClassName?: string;
};

export default function ColorPicker({
	allowAlpha = false,
	showHexInput = true,
	defaultValue = "#444444",
	value,
	onChange,
	className,
	colorPickerClassName,
	hexInputPlaceholder = "Enter hex color",
	hexInputDisabled = false,
	showDebugInfo = false,
	showDefaultColors = true,
	defaultColors = [
		"#ff0000", // Red
		"#00ff00", // Green
		"#0000ff", // Blue
		"#ffff00", // Yellow
		"#ff00ff", // Magenta
		"#00ffff", // Cyan
		"#ff8000", // Orange
		"#8000ff", // Purple
		"#000000", // Black
		"#ffffff", // White
		"#808080", // Gray
		"#c0c0c0", // Light Gray
	],
	defaultColorsClassName,
}: Props) {
	const [hsva, setHsva] = useState<ColorValue>(() => {
		const initialValue = value || defaultValue;
		try {
			return hexToHsva(initialValue);
		} catch {
			return { h: 0, s: 0, v: 68, a: 1 };
		}
	});

	const [hexInput, setHexInput] = useState<string>(() => {
		const initialValue = value || defaultValue;
		return initialValue;
	});

	// Update internal state when controlled value changes
	useEffect(() => {
		if (value && value !== hexInput) {
			try {
				const newHsva = hexToHsva(value);
				setHsva(newHsva);
				setHexInput(value);
			} catch {
				// Invalid hex value, ignore
			}
		}
	}, [value, hexInput]);

	const handleColorChange = (color: { hsva: ColorValue }) => {
		const newHsva = { ...color.hsva };

		// If alpha is not allowed, force it to 1
		if (!allowAlpha) {
			newHsva.a = 1;
		}

		setHsva(newHsva);

		// Update hex input for display
		const hexValue = hsvaToHex(newHsva);
		setHexInput(hexValue);

		// Call onChange with HSLA string
		const hslaValue = hsvaToHslaString(newHsva);
		onChange?.(hslaValue);
	};

	const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setHexInput(inputValue);

		// Validate and convert hex to hsva
		if (inputValue.match(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)) {
			try {
				const newHsva = hexToHsva(inputValue);

				// If alpha is not allowed, force it to 1
				if (!allowAlpha) {
					newHsva.a = 1;
				}

				setHsva(newHsva);

				// Call onChange with HSLA string
				const hslaValue = hsvaToHslaString(newHsva);
				onChange?.(hslaValue);
			} catch {
				// Invalid hex value, ignore
			}
		}
	};

	const handleDefaultColorClick = (color: string) => {
		try {
			const newHsva = hexToHsva(color);

			// If alpha is not allowed, force it to 1
			if (!allowAlpha) {
				newHsva.a = 1;
			}

			setHsva(newHsva);
			setHexInput(color);

			// Call onChange with HSLA string
			const hslaValue = hsvaToHslaString(newHsva);
			onChange?.(hslaValue);
		} catch {
			// Invalid hex value, ignore
		}
	};

	const displayHsva = allowAlpha ? hsva : { ...hsva, a: 1 };

	return (
		<div className={cn("flex flex-col gap-3 items-center", className)}>
			<Colorful
				className={cn("w-full! h-full!", colorPickerClassName)}
				color={displayHsva}
				onChange={handleColorChange}
				disableAlpha={!allowAlpha}
			/>
			{showHexInput && (
				<Input
					value={hexInput}
					onChange={handleHexInputChange}
					placeholder={hexInputPlaceholder}
					disabled={hexInputDisabled}
					className="font-mono text-center"
				/>
			)}
			{showDefaultColors && defaultColors.length > 0 && (
				<div className={cn("flex flex-wrap gap-2 w-full items-center justify-center", defaultColorsClassName)}>
					{defaultColors.map((color) => (
						<button
							key={color}
							type="button"
							className={cn(
								"w-8 h-8 rounded border border-border transition-colors cursor-pointer",
								"",
								hsvaToHex(hsva).toLowerCase() === color.toLowerCase() && "border border-foreground"
							)}
							style={{ backgroundColor: color }}
							onClick={() => handleDefaultColorClick(color)}
							title={color}
							aria-label={`Select color ${color}`}
						/>
					))}
				</div>
			)}
			{showDebugInfo && (
				<p className="font-mono bg-accent px-2 py-1 rounded w-full">debug info: {hsvaToHslaString(displayHsva)}</p>
			)}
		</div>
	);
}
