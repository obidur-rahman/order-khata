"use client";
/** The one top bar, shared by the landing and the app screens (docs/06 §4.2).
 *
 * Apple-style chrome: the bar is a translucent material, content scrolls
 * under it, and the bottom edge fades instead of drawing a divider. The
 * section links are a segmented control; language and appearance are a
 * second one, so both switches are one tap away on every screen.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  return (
    <header className="material sticky top-0 z-30">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Order Khata home" className="shrink-0">
          <Logo size={24} />
        </Link>

        <NavLinks className="hidden lg:inline-flex" />

        <div className="ml-auto flex items-center gap-3">
          {children}
          <PrefsControls />
          {trailing}
        </div>

        <NavLinks className="-mx-1 order-last w-full overflow-x-auto lg:hidden" />
      </div>

      {/* scroll edge: the content behind the bar fades out instead of hitting
          a hard 1px divider (docs/06 §6) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full h-4"
        style={{
          background:
            "linear-gradient(to bottom, color-mix(in oklab, var(--paper) 55%, transparent), transparent)",
        }}
      />
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
