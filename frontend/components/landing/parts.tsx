/** Landing primitives for the quiet-ledger skin: a section is pure air (no
 *  rule, no stamp box), the heading pair, soft pill CTAs. */
import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowRightIcon, ArrowUpRightIcon } from "@/components/icons";
import { Reveal } from "../Reveal";

/** A ruled section is retired: a section is padding and a max-width. */
export function Section({
  children,
  stamp,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  stamp?: string;
  className?: string;
  tone?: "default" | "sheet";
}) {
  return (
    <section className={`px-5 py-20 md:px-8 md:py-28 ${tone === "sheet" ? "bg-surface/40" : ""} ${className}`}>
      <div className="mx-auto max-w-[1180px]">
        {stamp && (
          <div className="mb-10 flex items-center gap-4">
            <span className="label text-muted">{stamp}</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/** The heading pair: one display line that states, one body line that
 *  explains. Left column is the statement, right column is the reading. */
export function SectionHead({
  title,
  lede,
  tone = "default",
  variant = "split",
}: {
  title: ReactNode;
  lede?: ReactNode;
  tone?: "default" | "contrast";
  /** split: statement left, reading right. stack: statement over reading.
   *  margin: statement wide, reading hung in the last column. */
  variant?: "split" | "stack" | "margin";
}) {
  const onContrast = tone === "contrast";
  const ink = onContrast ? "text-oncontrast" : "text-ink";
  const dim = onContrast ? "text-oncontrast/60" : "text-muted";
  const size = "clamp(30px, 3.8vw, 52px)";

  if (variant === "stack") {
    return (
      <Reveal>
        <h2 className={`display max-w-[20ch] ${ink}`} style={{ fontSize: size }}>
          {title}
        </h2>
        {lede && <p className={`mt-7 max-w-xl text-[16px] leading-[1.8] ${dim}`}>{lede}</p>}
      </Reveal>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-12 md:gap-10">
      <Reveal className={variant === "margin" ? "md:col-span-8" : "md:col-span-7"}>
        <h2 className={`display ${ink}`} style={{ fontSize: size }}>
          {title}
        </h2>
      </Reveal>
      {lede && (
        <Reveal
          className={variant === "margin" ? "md:col-span-4 md:self-end md:pb-1" : "md:col-span-5 md:pt-2"}
          delay={80}
        >
          <p className={`max-w-md text-[16px] leading-[1.8] ${dim}`}>{lede}</p>
        </Reveal>
      )}
    </div>
  );
}

/** Inline arrow link: quiet at rest, soft lift + arrow drift on hover. */
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
      prefetch={false}
      className={`group inline-flex min-h-7 items-center gap-1.5 rounded-full py-1 text-[13px] font-medium text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-ink ${className}`}
    >
      {children}
      <ArrowUpRightIcon size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Primary CTA: a soft pill key. The arrow walks on hover. */
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
      prefetch={false}
      className={`group inline-flex min-h-12 items-center gap-3 rounded-full bg-btn px-7 py-3.5 text-[13.5px] font-medium text-btn-ink shadow-lift transition hover:-translate-y-0.5 hover:opacity-90 ${className}`}
    >
      {children}
      <ArrowRightIcon size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}

/** Secondary CTA: same height, soft ghost pill. */
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
      prefetch={false}
      className={`group inline-flex min-h-12 items-center gap-2.5 rounded-full border border-line-strong px-7 py-3.5 text-[13.5px] font-medium text-ink transition hover:-translate-y-0.5 hover:border-ink/40 hover:bg-accent-tint ${className}`}
    >
      {children}
      <ArrowUpRightIcon size={13} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}
