/**
 * Every glyph on the page, drawn here.
 *
 * No icon font and no sprite sheet, for two reasons. The production build is served under
 * `default-src 'self'` with `connect-src 'none'`, so anything fetched from a CDN would be blocked
 * and the page would render with holes in it. And an icon font would be the only webfont in the
 * project, which would make `font-src 'self'` a claim about a file nobody has looked at.
 *
 * These are paths in the markup instead. They inherit `currentColor`, so a glyph is always the
 * colour of the text beside it, and none of them carries meaning on its own — every one sits next
 * to a word that says the same thing.
 */

type Glyph =
  | "eye"
  | "tag"
  | "page"
  | "person"
  | "robot"
  | "lock"
  | "shield"
  | "globe"
  | "arrow"
  | "chip"
  | "up"
  | "down"
  | "dots";

/** Path data only. Stroke weight, caps and joins are set once, below. */
const PATHS: Record<Glyph, readonly string[]> = {
  eye: ["M2 12s3.6-6.6 10-6.6S22 12 22 12s-3.6 6.6-10 6.6S2 12 2 12z", "M14.6 12a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0z"],
  tag: ["M20 4h-7.2l-8.8 8.8 7.2 7.2 8.8-8.8z", "M16.9 7.9h.01"],
  page: ["M6.5 3h7.2L18 7.3V21H6.5z", "M9.5 12.4h5.4", "M9.5 16.4h5.4"],
  person: ["M4.4 20.4c0-3.4 3.4-5.2 7.6-5.2s7.6 1.8 7.6 5.2", "M15.6 8a3.6 3.6 0 1 1-7.2 0 3.6 3.6 0 0 1 7.2 0z"],
  robot: ["M5.4 8.6h13.2v9.8H5.4z", "M12 5.2v3.4", "M9.2 12.6h.01", "M14.8 12.6h.01", "M9.8 15.6h4.4"],
  lock: ["M5 10.6h14v10.2H5z", "M8.2 10.6V7.4a3.8 3.8 0 0 1 7.6 0v3.2"],
  shield: ["M12 2.8 20 6v6.1c0 4.4-3.2 7.7-8 9.1-4.8-1.4-8-4.7-8-9.1V6z", "m8.8 12.2 2.4 2.4 4.2-4.6"],
  globe: ["M20.6 12a8.6 8.6 0 1 1-17.2 0 8.6 8.6 0 0 1 17.2 0z", "M3.6 12h16.8", "M12 3.4c2.2 2.4 3.4 5.4 3.4 8.6s-1.2 6.2-3.4 8.6c-2.2-2.4-3.4-5.4-3.4-8.6S9.8 5.8 12 3.4z"],
  arrow: ["M4 12h13.4", "m13 7.2 5 4.8-5 4.8"],
  chip: ["M7 7h10v10H7z", "M12 3v4", "M12 17v4", "M3 12h4", "M17 12h4"],
  up: ["m6.4 14.6 5.6-5.4 5.6 5.4"],
  down: ["m6.4 9.4 5.6 5.4 5.6-5.4"],
  dots: ["M12 6.4h.01", "M12 12h.01", "M12 17.6h.01"],
};

/**
 * Always `aria-hidden`. A glyph that carried information a screen reader needed would be a bug in
 * the markup beside it, not a missing label here.
 */
export function Icon({ name, size = 16 }: { name: Glyph; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
