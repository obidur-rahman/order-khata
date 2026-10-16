"use client";
/** The one top bar, shared by the landing and the app screens (docs/06 §4.2).
 *
 * Surface (user brief): on the landing the bar is fully transparent over the
 * hero and the material fill fades in only after the visitor scrolls; every
 * other screen keeps a constant 50%-transparent fill. The section links sit
 * centred in the bar's own axis on desktop, and in a centred row underneath
 * on mobile. The segmented control carries no background either: the active
 * item is an accent wash, never an ink (black) pill.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useHealth } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { HealthDot } from "./HealthDot";
import { MoonIcon, SunIcon } from "./icons";
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
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}>
            {t(n.key)}
          </Link>
        );
      })}
    </nav>
  );
}

/** Language + appearance switches (docs/06 §4.6). */
export function PrefsControls({ className = "" }: { className?: string }) {
  const { lang, theme, setLang, setTheme, t } = usePrefs();
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
      <div className="seg" role="group" aria-label={t("nav.appearance")}>
        <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")} aria-label={t("pref.light")}>
          <SunIcon size={14} />
        </button>
        <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")} aria-label={t("pref.dark")}>
          <MoonIcon size={14} />
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
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLanding = pathname === "/";
  const surface = isLanding
    ? scrolled
      ? "material"
      : "bg-transparent"
    : "material-50";
  const showEdge = isLanding ? scrolled : true;

  return (
    <header className={`sticky top-0 z-30 transition-colors duration-300 ${surface}`}>
      <div className="relative mx-auto flex max-w-[1400px] items-center gap-x-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Order Khata home" className="shrink-0">
          <Logo size={24} />
        </Link>

        {/* centred section links: pinned to the bar's own horizontal centre,
            so the nav is symmetric regardless of logo/control widths */}
        <div className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center lg:flex">
          <NavLinks />
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          {children}
          <PrefsControls />
          {trailing}
        </div>
      </div>

      {/* mobile: the links get their own centred row under the bar */}
      <div className="mx-auto flex max-w-[1400px] justify-center overflow-x-auto px-4 pb-2 lg:hidden">
        <NavLinks />
      </div>

      {/* scroll edge: only while the bar has a fill; the content behind it
          fades out instead of hitting a hard 1px divider (docs/06 §6) */}
      {showEdge && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full h-4"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in oklab, var(--paper) 55%, transparent), transparent)",
          }}
        />
      )}
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
