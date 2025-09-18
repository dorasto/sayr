"use client";

import { useCallback, useRef, useState } from "react";
import ReactCrop, { type Crop, centerCrop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Label } from "./label";
import { Slider } from "./slider";

interface ImageCropProps {
	src: string;
	aspectRatio: number;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onCropComplete: (croppedImageBase64: string) => void;
	title?: string;
	description?: string;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
	const imageAspect = mediaWidth / mediaHeight;

	// If the image is wider than the requested aspect, make the crop span the
	// full height and compute the width needed to keep the requested aspect.
	if (imageAspect > aspect) {
		const heightPercent = 100;
		const widthPercent = (aspect / imageAspect) * 100; // desiredWidthPx / mediaWidth * 100
		return centerCrop(
			{
				unit: "%",
				width: widthPercent,
				height: heightPercent,
			},
			mediaWidth,
			mediaHeight
		);
	}

	// Otherwise make the crop span the full width and compute the height that
	// fits the requested aspect ratio.
	const widthPercent = 100;
	const heightPercent = (imageAspect / aspect) * 100; // desiredHeightPx / mediaHeight * 100
	return centerCrop(
		{
			unit: "%",
			width: widthPercent,
			height: heightPercent,
		},
		mediaWidth,
		mediaHeight
	);
}

export function ImageCrop({
	src,
	aspectRatio,
	isOpen,
	onOpenChange,
	onCropComplete,
	title = "Crop Image",
	description = "Adjust the crop area and zoom to get the perfect image.",
}: ImageCropProps) {
	const imgRef = useRef<HTMLImageElement>(null);
	const [crop, setCrop] = useState<Crop>();
	const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
	const [scale] = useState(1);
	const [rotate] = useState(0);

	const onImageLoad = useCallback(
		(e: React.SyntheticEvent<HTMLImageElement>) => {
			const { width, height } = e.currentTarget;
			// Create the centered percent-based crop and apply it to ReactCrop
			const percentCrop = centerAspectCrop(width, height, aspectRatio);
			setCrop(percentCrop);

			// Convert the percent-based crop into a pixel-based crop so we have
			// a `completedCrop` available even if the user doesn't interact with the
			// crop box (ReactCrop only calls onComplete after user interaction).
			if (percentCrop && typeof percentCrop.width === "number" && typeof percentCrop.height === "number") {
				const pixelCrop: PixelCrop = {
					x: Math.round(((percentCrop.x ?? 0) * width) / 100),
					y: Math.round(((percentCrop.y ?? 0) * height) / 100),
					width: Math.round((percentCrop.width * width) / 100),
					height: Math.round((percentCrop.height * height) / 100),
				};
				setCompletedCrop(pixelCrop);
			}
		},
		[aspectRatio]
	);

	const getCroppedImg = useCallback(
		(image: HTMLImageElement, crop: PixelCrop, scale = 1, rotate = 0): Promise<string> => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				throw new Error("No 2d context");
			}

			const scaleX = image.naturalWidth / image.width;
			const scaleY = image.naturalHeight / image.height;

			// Set canvas size to the desired crop size
			canvas.width = crop.width;
			canvas.height = crop.height;

			// Scale the canvas to account for pixel ratio
			const pixelRatio = window.devicePixelRatio;
			canvas.width = crop.width * pixelRatio;
			canvas.height = crop.height * pixelRatio;
			ctx.scale(pixelRatio, pixelRatio);
			canvas.style.width = `${crop.width}px`;
			canvas.style.height = `${crop.height}px`;

			// Center the image in the canvas

			ctx.save();

			// Move to the center of the canvas
			ctx.translate(crop.width / 2, crop.height / 2);
			ctx.rotate((rotate * Math.PI) / 180);
			ctx.scale(scale, scale);

			// Draw the image
			ctx.drawImage(
				image,
				crop.x * scaleX,
				crop.y * scaleY,
				crop.width * scaleX,
				crop.height * scaleY,
				-crop.width / 2,
				-crop.height / 2,
				crop.width,
				crop.height
			);

			ctx.restore();

			return new Promise((resolve) => {
				canvas.toBlob((blob) => {
					if (!blob) {
						throw new Error("Failed to create blob");
					}
					const reader = new FileReader();
					reader.onload = () => resolve(reader.result as string);
					reader.readAsDataURL(blob);
				}, "image/webp");
			});
		},
		[]
	);

	const handleCropComplete = useCallback(async () => {
		if (completedCrop && imgRef.current) {
			try {
				const croppedImage = await getCroppedImg(imgRef.current, completedCrop, scale, rotate);
				onCropComplete(croppedImage);
				onOpenChange(false);
			} catch (error) {
				console.error("Error cropping image:", error);
			}
		}
	}, [completedCrop, scale, rotate, getCroppedImg, onCropComplete, onOpenChange]);

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Crop Area */}
					<div className="flex justify-center">
						<ReactCrop
							crop={crop}
							onChange={(_, percentCrop) => setCrop(percentCrop)}
							onComplete={(c) => setCompletedCrop(c)}
							aspect={aspectRatio}
							minWidth={100}
							minHeight={100}
							keepSelection
						>
							<img
								ref={imgRef}
								alt="Crop me"
								src={src}
								style={{
									transform: `scale(${scale}) rotate(${rotate}deg)`,
									maxHeight: "400px",
									maxWidth: "100%",
								}}
								onLoad={onImageLoad}
								className="bg-accent"
							/>
						</ReactCrop>
					</div>
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button type="button" onClick={handleCropComplete} disabled={!completedCrop}>
						Upload
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
