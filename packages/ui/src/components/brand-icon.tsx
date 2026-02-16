interface Props {
  /** Color of the bolt/lightning icon */
  color?: string;
  /** Size of the icon in pixels (both width and height) */
  size?: number;
  /** Stroke width of the bolt icon */
  strokeWidth?: number;
  /** Additional CSS classes */
  className?: string;
}

export default function SayrIcon({
  color = "currentColor",
  size = 24,
  strokeWidth = 2.6,
  className = "",
}: Props) {
  // Calculate relative stroke width based on size
  const relativeStrokeWidth = (strokeWidth / 24) * size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="Tasq icon"
      className={className}
    >
      <path
        d="M9 5.5 L11.5 11 L9.8 12.6 L13.8 18 L16.8 12.8 C17.4 11.9 18.4 10.6 18.9 9.9 L15.6 8.2"
        stroke={color}
        strokeWidth={relativeStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
