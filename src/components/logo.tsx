/**
 * The Liftalot mark, inlined rather than loaded from /brand.
 *
 * Inline SVG means it paints with the first byte of HTML — no second request,
 * no flash of a missing logo on the login screen — and the dots can pick up
 * theme tokens if the palette ever moves. Source of truth for the geometry is
 * ideas/brand/liftalot-mark.svg; the fills are the brand palette verbatim.
 *
 * The mark is a rising line of session dots, which is the same thing the
 * progress charts draw. That is not a coincidence worth breaking.
 */
export function Mark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Liftalot"
    >
      <path
        d="M10 50 L24 40 L38 30 L54 14"
        fill="none"
        stroke="#7d2f14"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="50" r="6" fill="#f8b870" />
      <circle cx="24" cy="40" r="6" fill="#f8b870" />
      <circle cx="38" cy="30" r="6" fill="#ea5b0c" />
      <circle cx="54" cy="14" r="8" fill="#f87810" />
    </svg>
  );
}

/**
 * Mark plus wordmark. The word is real text, not the SVG lockup's <text> —
 * that node specifies Sora and would silently fall back to Helvetica without
 * the webfont, which reads as a different brand. Rendering it as HTML lets it
 * inherit whatever the app's type stack actually is.
 */
export function Lockup({
  markSize = 28,
  className = "",
}: {
  markSize?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark size={markSize} />
      <span
        className="font-brand font-bold tracking-[-0.04em]"
        style={{ fontSize: markSize * 0.86 }}
      >
        Liftalot
      </span>
    </span>
  );
}
