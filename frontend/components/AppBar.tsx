"use client";
/** The one top bar, shared by the landing and the app screens (docs/06 §4.2).
 *
 * Soft-minimal skin: a floating capsule that lifts off the page with a soft
 * shadow and a blur — never a full-width ruled strip. The logo sits to its
 * left, prefs + actions to its right; on phones the section links drop into
 * the capsule's own second row. Wide tools (the threshold slider) get their
 * own row under the capsule so they never collide with the links.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useHealth } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { HealthDot } from "./HealthDot";
import { Logo } from "./Logo";

const NAV = [
  { href: "/inbox/", key: "nav.inbox" },
  { href: "/try/", key: "nav.try" },
  { href: "/dashboard/", key: "nav.dashboard" },
  { href: "/evaluation/", key: "nav.evaluation" },
  { href: "/preferences/", key: "nav.preferences" },
];

function NavLinks({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { t } = usePrefs();
  return (
    <nav className={`seg ${className}`} aria-label="Sections">
      {NAV.map((n) => {
        const active = pathname?.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} prefetch={false} aria-current={active ? "page" : undefined}>
            {t(n.key)}
          </Link>
        );
      })}
    </nav>
  );
}

/** The language switch (docs/06 §4.6). The site is dark-only: no theme toggle. */
export function PrefsControls({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = usePrefs();
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="seg" role="group" aria-label={t("nav.language")}>
        <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
          EN
        </button>
        <button type="button" aria-pressed={lang === "bn"} onClick={() => setLang("bn")}>
          বাং
        </button>
      </div>
    </div>
  );
}

export function TopBar({
  children,
  trailing,
}: {
  children?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-30 px-4 pt-3 sm:px-6 sm:pt-4">
      <div
        className={`relative mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2 rounded-[26px] border border-line bg-surface/85 px-3 py-2 backdrop-blur-xl transition-shadow duration-300 sm:px-4 ${
          scrolled ? "shadow-lift" : "shadow-soft"
        }`}
      >
        <Link
          href="/"
          prefetch={false}
          aria-label="Order Khata home"
          className="group shrink-0 rounded-full transition-opacity hover:opacity-75"
        >
          <Logo size={24} />
        </Link>

        {/* centred section links: pinned to the capsule's own centre on lg+ */}
        <div className="absolute inset-x-0 hidden justify-center lg:flex" style={{ pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            <NavLinks />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <PrefsControls />
          {trailing}
        </div>

        {/* mobile / small tablet: links as their own centred row in the capsule */}
        <div className="w-full lg:hidden">
          <NavLinks className="w-full flex-wrap justify-center" />
        </div>

        {/* wide tools (the threshold slider) get their own soft row */}
        {children && <div className="flex w-full justify-center pb-1 sm:justify-end">{children}</div>}
      </div>
    </header>
  );
}

/** App screens: the bar plus the live health light. */
export function AppBar({ children }: { children?: React.ReactNode }) {
  const health = useHealth();
  return (
    <TopBar trailing={<HealthDot health={health} />}>
      {children}
    </TopBar>
  );
}
