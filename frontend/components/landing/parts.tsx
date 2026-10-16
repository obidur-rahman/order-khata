/** Landing primitives: a section shell, a heading pair, arrow links, CTAs.
 *
 * Sections are separated by space, not rules — the page reads as one
 * editorial column rather than a stack of boxed-off panels.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowUpRightIcon, ArrowRightIcon } from "@/components/icons";

/** Padded landing section. `wash` adds the warm colour field. */
export function Section({
  children,
  wash = false,
  className = "",
}: {
  children: ReactNode;
  wash?: boolean;
  className?: string;
}) {
  return (
    <section className={`${wash ? "wash-warm " : ""}px-6 py-28 md:py-36 ${className}`}>
      <div className="mx-auto max-w-[1400px]">{children}</div>
    </section>
  );
}

/** Heading pair: the line that says it, then the line that explains it. */
export function SectionHead({
  title,
  lede,
  tone = "default",
}: {
  title: ReactNode;
  lede?: ReactNode;
  /** "contrast" for headings sitting on the inverted surface. */
  tone?: "default" | "contrast";
}) {
  const onContrast = tone === "contrast";
  return (
    <div className="max-w-4xl">
      <h2
        className={`font-display font-extrabold ${onContrast ? "text-oncontrast" : "text-ink"}`}
        style={{ fontSize: "clamp(32px, 4.2vw, 56px)", lineHeight: 1.04, letterSpacing: "-0.035em" }}
      >
        {title}
      </h2>
      {lede && (
        <p
          className={`mt-8 max-w-2xl text-[17px] leading-[1.75] ${
            onContrast ? "text-oncontrast/65" : "text-muted"
          }`}
        >
          {lede}
        </p>
      )}
    </div>
  );
}

/** Inline arrow link. */
export function ArrowLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink underline decoration-line underline-offset-4 transition hover:decoration-accent ${className}`}
    >
      {children}
      <ArrowUpRightIcon size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Primary CTA: ink pill with an accent arrow. */
export function PrimaryCTA({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 font-mono text-[12px] uppercase tracking-[0.1em] text-paper shadow-soft transition hover:bg-accent-deep ${className}`}
    >
      {children}
      <ArrowRightIcon size={16} className="text-accent transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/** Secondary CTA: hairline, same shape as the primary so they read as a pair. */
export function GhostCTA({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-7 py-4 font-mono text-[12px] uppercase tracking-[0.1em] text-ink transition hover:border-ink ${className}`}
    >
      {children}
      <ArrowUpRightIcon size={14} />
    </Link>
  );
}
