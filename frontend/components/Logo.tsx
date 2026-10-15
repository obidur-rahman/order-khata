/** docs/06 §1: black rounded-square with yellow inbox-tray glyph;
 * wordmark in Plus Jakarta Sans ExtraBold, lowercase "dokanbox". */

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[8px] bg-ink"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 14l2.4-7.2A2 2 0 018.3 5.5h7.4a2 2 0 011.9 1.3L20 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z"
          fill="#FFD60A"
        />
        <path
          d="M4 14h4.5a1.5 1.5 0 001.4-1l.3-.7a1.5 1.5 0 011.4-1h.8a1.5 1.5 0 011.4 1l.3.7a1.5 1.5 0 001.4 1H20"
          stroke="#0F0F0F"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span
        className="font-display font-extrabold lowercase tracking-tight text-ink"
        style={{ fontSize: size * 0.62 }}
      >
        dokanbox
      </span>
    </span>
  );
}
