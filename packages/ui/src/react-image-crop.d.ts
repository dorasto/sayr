declare module "react-image-crop" {
	export interface Crop {
		unit: "%" | "px";
		x: number;
		y: number;
		width: number;
		height: number;
	}

	export interface PixelCrop {
		x: number;
		y: number;
		width: number;
		height: number;
	}

	export function centerCrop(crop: Partial<Crop>, mediaWidth: number, mediaHeight: number): Crop;
	export function makeAspectCrop(crop: Partial<Crop>, aspect: number, mediaWidth: number, mediaHeight: number): Crop;

	interface ReactCropProps {
		crop?: Crop;
		onChange: (crop: PixelCrop, percentCrop: Crop) => void;
		onComplete?: (crop: PixelCrop) => void;
		aspect?: number;
		minWidth?: number;
		minHeight?: number;
		keepSelection?: boolean;
		children: React.ReactNode;
	}

	const ReactCrop: React.ComponentType<ReactCropProps>;
	export default ReactCrop;
}
