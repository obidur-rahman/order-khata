/* eslint-disable @next/next/no-img-element -- next.config.ts sets
   output: "export", so there is no image optimizer for next/image to delegate
   to; a plain `<img>` is the right element for this app. */

/** docs/06 §1: the mark is artwork, not drawn paths. The wordmark stays real
 *  text in the display serif, title case "Order Khata": it keeps the display
 *  metrics, scales with `size`, and is not baked into a bitmap. */

/** The dark-background artwork (`public/logo_dark-*.png`) — the only one that
 *  ships: the site is dark-only, so the light variant is not even fetched.
 *
 *  The 500×500 file is the master and is never fetched; the derivatives are
 *  what ships. `sizes` is the element's own box, so `srcSet` resolves to the
 *  smallest file that still covers it: 96px covers every mark up to 2× (bar 24,
 *  footer 26), and 192px is reached only by the 64px loading mark on a dense
 *  screen. Without `sizes` the browser assumes 100vw and always takes the
 *  largest file. */
function MarkArtwork({ size }: { size: number }) {
  return (
    <img
      src="/logo_dark-96.png"
      srcSet="/logo_dark-96.png 96w, /logo_dark-192.png 192w"
      sizes={`${size}px`}
      alt=""
      width={size}
      height={size}
    />
  );
}

/** The square mark. Dark-only: one artwork, straight from the server markup —
 *  no swap, no hidden second download, no theme class to keep in sync, no flash
 *  by construction. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return <MarkArtwork size={size} />;
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span
        className="font-display text-ink"
        style={{ fontSize: size * 0.82, letterSpacing: "-0.02em", lineHeight: 1 }}
      >
        Order Khata
      </span>
    </span>
  );
}
