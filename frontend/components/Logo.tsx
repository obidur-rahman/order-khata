/* eslint-disable @next/next/no-img-element -- next.config.ts sets
   output: "export", so there is no image optimizer for next/image to delegate
   to; a plain `<img>` is the right element for this app. */

/** docs/06 §1: the mark is artwork now, not drawn paths. The wordmark stays real
 *  text in Bricolage Grotesque ExtraBold, title case "Order Khata": it keeps the
 *  display metrics, scales with `size`, and is not baked into a bitmap. */

/** One artwork of the light/dark pair (`public/logo_*.png`).
 *
 *  The 500×500 files are the masters and are never fetched; the derivatives are
 *  what ships. `sizes` is the element's own box, so `srcSet` resolves to the
 *  smallest file that still covers it: 96px covers every mark up to 2× (bar 24,
 *  footer 26), and 192px is reached only by the 64px loading mark on a dense
 *  screen. Without `sizes` the browser assumes 100vw and always takes the
 *  largest file. */
function MarkArtwork({ variant, size }: { variant: "light" | "dark"; size: number }) {
  return (
    <img
      className={`logo-${variant}`}
      src={`/logo_${variant}-96.png`}
      srcSet={`/logo_${variant}-96.png 96w, /logo_${variant}-192.png 192w`}
      sizes={`${size}px`}
      alt=""
      width={size}
      height={size}
    />
  );
}

/** The square mark. Both artworks are rendered and the unused one is
 *  `display: none` (`.logo-swap`, globals.css), which is what makes the theme
 *  switch instant: the CSS is keyed off the `.dark` class the pre-paint script
 *  puts on <html> (layout.tsx), so the right artwork is on screen from the first
 *  frame — no JavaScript, no hydration mismatch, no flash, and no `dark:` class
 *  in this component.
 *
 *  `alt=""` plus `aria-hidden` keeps the decorative mark out of the accessibility
 *  tree: the wordmark beside it (or the caller's own label) already names the
 *  product, so the name is never announced twice. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="logo-swap inline-flex shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <MarkArtwork variant="light" size={size} />
      <MarkArtwork variant="dark" size={size} />
    </span>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span
        className="font-display font-extrabold text-ink"
        style={{ fontSize: size * 0.62, letterSpacing: "-0.02em" }}
      >
        Order Khata
      </span>
    </span>
  );
}
