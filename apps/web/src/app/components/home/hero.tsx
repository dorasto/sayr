"use client";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";

import React, { useEffect, useRef, useState } from "react";
import Balancer from "react-wrap-balancer";
import LoginDialog from "../auth/login";

export function HeroSectionWithBeamsAndGrid() {
	const containerRef = useRef<HTMLDivElement>(null);
	const parentRef = useRef<HTMLDivElement>(null);

	return (
		<div
			ref={parentRef}
			className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-20 md:px-8 md:py-40"
		>
			<BackgroundGrids />
			<CollisionMechanism
				beamOptions={{
					initialX: -400,
					translateX: 600,
					duration: 7,
					repeatDelay: 3,
				}}
				containerRef={containerRef}
				parentRef={parentRef}
			/>
			<CollisionMechanism
				beamOptions={{
					initialX: -200,
					translateX: 800,
					duration: 4,
					repeatDelay: 3,
				}}
				containerRef={containerRef}
				parentRef={parentRef}
			/>
			<CollisionMechanism
				beamOptions={{
					initialX: 200,
					translateX: 1200,
					duration: 5,
					repeatDelay: 3,
				}}
				containerRef={containerRef}
				parentRef={parentRef}
			/>
			<CollisionMechanism
				containerRef={containerRef}
				parentRef={parentRef}
				beamOptions={{
					initialX: 400,
					translateX: 1400,
					duration: 6,
					repeatDelay: 3,
				}}
			/>

			<h2 className="relative z-50 mx-auto mb-4 mt-4 max-w-4xl text-balance text-center text-4xl font-semibold tracking-tight text-foreground">
				<Balancer>A transparent workspace for teams & communities</Balancer>
			</h2>
			<p className="relative z-50 mx-auto mt-4 max-w-lg px-4 text-center text-foreground">
				Empower your organization and community with unified project management. Collaborate openly, share progress,
				and manage tasks—all with granular privacy and seamless external participation.
			</p>
			<div className="mb-10 mt-8 flex w-full flex-col items-center justify-center gap-4 px-8 sm:flex-row md:mb-20">
				<LoginDialog trigger={<Button size={"lg"}>Get started</Button>} />
				{/* <Link
					href="/pricing"
					className="shadow-input group relative z-20 flex h-10 w-full cursor-pointer items-center justify-center space-x-2 rounded-lg bg-white p-px px-4 py-2 text-sm font-semibold leading-6 text-black no-underline transition duration-200 hover:-translate-y-0.5 sm:w-52 dark:bg-neutral-800 dark:text-white"
				>
					Explore beams
				</Link> */}
			</div>
			<div
				ref={containerRef}
				className="relative mx-auto max-w-7xl rounded-[32px] border border-accent bg-muted p-2 backdrop-blur-lg md:p-4"
			>
				<div className="rounded-[24px] border border-border bg-card p-2">
					{/* <Image
						src="https://assets.aceternity.com/pro/aceternity-landing.webp"
						alt="header"
						width={1920}
						height={1080}
						className="rounded-[20px]"
					/> */}
				</div>
			</div>
		</div>
	);
}

const BackgroundGrids = () => {
	return (
		<div className="pointer-events-none absolute inset-0 z-0 grid h-full w-full -rotate-45 transform select-none grid-cols-2 gap-10 md:grid-cols-4">
			<div className="relative h-full w-full">
				<GridLineVertical className="left-0" />
				<GridLineVertical className="left-auto right-0" />
			</div>
			<div className="relative h-full w-full">
				<GridLineVertical className="left-0" />
				<GridLineVertical className="left-auto right-0" />
			</div>
			<div className="relative h-full w-full bg-gradient-to-b from-transparent via-muted to-transparent">
				<GridLineVertical className="left-0" />
				<GridLineVertical className="left-auto right-0" />
			</div>
			<div className="relative h-full w-full">
				<GridLineVertical className="left-0" />
				<GridLineVertical className="left-auto right-0" />
			</div>
		</div>
	);
};

const CollisionMechanism = React.forwardRef<
	HTMLDivElement,
	{
		containerRef: React.RefObject<HTMLDivElement | null>;
		parentRef: React.RefObject<HTMLDivElement | null>;
		beamOptions?: {
			initialX?: number;
			translateX?: number;
			initialY?: number;
			translateY?: number;
			rotate?: number;
			className?: string;
			duration?: number;
			delay?: number;
			repeatDelay?: number;
		};
	}
>(({ parentRef, containerRef, beamOptions = {} }, _ref) => {
	const beamRef = useRef<HTMLDivElement>(null);
	const [collision, setCollision] = useState<{
		detected: boolean;
		coordinates: { x: number; y: number } | null;
	}>({ detected: false, coordinates: null });
	const [beamKey, setBeamKey] = useState(0);
	const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);

	useEffect(() => {
		const checkCollision = () => {
			if (beamRef.current && containerRef.current && parentRef.current && !cycleCollisionDetected) {
				const beamRect = beamRef.current.getBoundingClientRect();
				const containerRect = containerRef.current.getBoundingClientRect();
				const parentRect = parentRef.current.getBoundingClientRect();

				if (beamRect.bottom >= containerRect.top) {
					const relativeX = beamRect.left - parentRect.left + beamRect.width / 2;
					const relativeY = beamRect.bottom - parentRect.top;

					setCollision({
						detected: true,
						coordinates: { x: relativeX, y: relativeY },
					});
					setCycleCollisionDetected(true);
					if (beamRef.current) {
						beamRef.current.style.opacity = "0";
					}
				}
			}
		};

		const animationInterval = setInterval(checkCollision, 50);

		return () => clearInterval(animationInterval);
	}, [cycleCollisionDetected, containerRef, parentRef.current]);

	useEffect(() => {
		if (collision.detected && collision.coordinates) {
			setTimeout(() => {
				setCollision({ detected: false, coordinates: null });
				setCycleCollisionDetected(false);
				// Set beam opacity to 0
				if (beamRef.current) {
					beamRef.current.style.opacity = "1";
				}
			}, 2000);

			// Reset the beam animation after a delay
			setTimeout(() => {
				setBeamKey((prevKey) => prevKey + 1);
			}, 2000);
		}
	}, [collision]);

	return (
		<>
			<motion.div
				key={beamKey}
				ref={beamRef}
				animate="animate"
				initial={{
					translateY: beamOptions.initialY || "-200px",
					translateX: beamOptions.initialX || "0px",
					rotate: beamOptions.rotate || -45,
				}}
				variants={{
					animate: {
						translateY: beamOptions.translateY || "800px",
						translateX: beamOptions.translateX || "700px",
						rotate: beamOptions.rotate || -45,
					},
				}}
				transition={{
					duration: beamOptions.duration || 8,
					repeat: Infinity,
					repeatType: "loop",
					ease: "linear",
					delay: beamOptions.delay || 0,
					repeatDelay: beamOptions.repeatDelay || 0,
				}}
				className={cn(
					"absolute left-96 top-20 m-auto h-14 w-px rounded-full bg-gradient-to-t from-primary via-yellow-500 to-transparent",
					beamOptions.className
				)}
			/>
			<AnimatePresence>
				{collision.detected && collision.coordinates && (
					<Explosion
						key={`${collision.coordinates.x}-${collision.coordinates.y}`}
						className=""
						style={{
							left: `${collision.coordinates.x + 20}px`,
							top: `${collision.coordinates.y}px`,
							transform: "translate(-50%, -50%)",
						}}
					/>
				)}
			</AnimatePresence>
		</>
	);
});

CollisionMechanism.displayName = "CollisionMechanism";

const Explosion = ({ ...props }: React.HTMLProps<HTMLDivElement>) => {
	const spans = Array.from({ length: 20 }, (_, index) => ({
		id: index,
		initialX: 0,
		initialY: 0,
		directionX: Math.floor(Math.random() * 80 - 40),
		directionY: Math.floor(Math.random() * -50 - 10),
	}));

	return (
		<div {...props} className={cn("absolute z-50 h-2 w-2", props.className)}>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: [0, 1, 0] }}
				exit={{ opacity: 0 }}
				transition={{ duration: 1, ease: "easeOut" }}
				className="absolute -inset-x-10 top-0 m-auto h-[4px] w-10 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent blur-sm"
			></motion.div>
			{spans.map((span) => (
				<motion.span
					key={span.id}
					initial={{ x: span.initialX, y: span.initialY, opacity: 1 }}
					animate={{ x: span.directionX, y: span.directionY, opacity: 0 }}
					transition={{ duration: Math.random() * 1.5 + 0.5, ease: "easeOut" }}
					className="absolute h-1 w-1 rounded-full bg-gradient-to-b from-primary to-yellow-500"
				/>
			))}
		</div>
	);
};

const GridLineVertical = ({ className, offset }: { className?: string; offset?: string }) => {
	return (
		<div
			style={
				{
					"--background": "#ffffff",
					"--color": "rgba(0, 0, 0, 0.2)",
					"--height": "5px",
					"--width": "1px",
					"--fade-stop": "90%",
					"--offset": offset || "150px", //-100px if you want to keep the line inside
					"--color-dark": "rgba(255, 255, 255, 0.3)",
					maskComposite: "exclude",
				} as React.CSSProperties
			}
			className={cn(
				"absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-[var(--width)]",
				"bg-[linear-gradient(to_bottom,var(--color),var(--color)_50%,transparent_0,transparent)]",
				"[background-size:var(--width)_var(--height)]",
				"[mask:linear-gradient(to_top,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_bottom,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]",
				"[mask-composite:exclude]",
				"z-30",
				"dark:bg-[linear-gradient(to_bottom,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]",
				className
			)}
		></div>
	);
};
