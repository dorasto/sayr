import { type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function subscribeReducedMotion(onChange: () => void) {
	const query = window.matchMedia("(prefers-reduced-motion: reduce)");
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

/** Respects the visitor's reduced-motion setting (false on the server). */
export function usePrefersReducedMotion() {
	return useSyncExternalStore(
		subscribeReducedMotion,
		() => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		() => false
	);
}

/** Props for a recreation driven by `useReplay`: `at` runs from 0 to its step count. */
export interface ReplayProps {
	at: number;
}

/**
 * A short scripted animation that plays once, then rests on its finished state.
 * `at` runs from 0 to `steps` (2.5 = halfway through the third step), so a
 * recreation can derive everything it shows from one number, like the hero's
 * loop. It rests at `steps`, so the server HTML and reduced-motion visitors get
 * the finished picture. It plays the first time the element scrolls into view,
 * and again whenever it's hovered or focused.
 */
export function useReplay<T extends HTMLElement = HTMLElement>(steps: number, stepMs = 900) {
	const reducedMotion = usePrefersReducedMotion();
	const [at, setAt] = useState(steps);
	const frame = useRef(0);
	const playing = useRef(false);
	const ref = useRef<T>(null);

	const play = useCallback(() => {
		if (reducedMotion || playing.current) return;
		playing.current = true;
		const start = performance.now();
		const tick = (now: number) => {
			const position = (now - start) / stepMs;
			if (position >= steps) {
				playing.current = false;
				setAt(steps);
				return;
			}
			setAt(position);
			frame.current = requestAnimationFrame(tick);
		};
		frame.current = requestAnimationFrame(tick);
	}, [reducedMotion, steps, stepMs]);

	useEffect(() => {
		const element = ref.current;
		if (!element || reducedMotion) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				observer.disconnect();
				play();
			},
			{ threshold: 0.6 }
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, [play, reducedMotion]);

	useEffect(() => () => cancelAnimationFrame(frame.current), []);

	return { at, ref, play, triggers: { onPointerEnter: play, onFocus: play } };
}

/** The share of a step that has played: 0 before `from`, 1 after `from + length`. */
export function stepProgress(at: number, from: number, length = 1) {
	return Math.min(1, Math.max(0, (at - from) / length));
}

/** Classes that fade something in place; it keeps its space, so nothing shifts as it appears. */
export function fade(show: boolean) {
	return cn(
		"transition-[opacity,transform] duration-300 motion-reduce:transition-none",
		show ? "opacity-100" : "translate-y-1 opacity-0"
	);
}

/** A block that fades in place (see `fade`). */
export function Reveal({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
	return (
		<div aria-hidden={!show} className={cn(fade(show), className)}>
			{children}
		</div>
	);
}

/**
 * Swaps between two states without moving anything around it: both render in
 * one grid cell, so the cell is always the size of the larger, and only the
 * active one is visible.
 */
export function Swap({
	on,
	when,
	off,
	className,
}: {
	on: ReactNode;
	when: boolean;
	off: ReactNode;
	className?: string;
}) {
	return (
		<span className={cn("inline-grid", className)}>
			<span aria-hidden={!when} className={cn("col-start-1 row-start-1", !when && "invisible")}>
				{on}
			</span>
			<span aria-hidden={when} className={cn("col-start-1 row-start-1", when && "invisible")}>
				{off}
			</span>
		</span>
	);
}

/** Text typed out character by character; the untyped rest still takes up its space. */
export function Typed({ text, progress }: { text: string; progress: number }) {
	const count = Math.round(text.length * progress);
	return (
		<>
			{text.slice(0, count)}
			{/* Zero-width anchor, so the caret never pushes text onto another line. */}
			{progress > 0 && progress < 1 && (
				<span className="relative">
					<span className="absolute left-0 animate-pulse">▍</span>
				</span>
			)}
			<span className="invisible">{text.slice(count)}</span>
		</>
	);
}
