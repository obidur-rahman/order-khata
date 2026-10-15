"use client";
/** Top bar shared by the app screens (docs/06 §4.2): logo, static shop
 * switcher, nav, slot for slider + counters, health dot. */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useHealth } from "@/lib/hooks";
import { HealthDot } from "./HealthDot";
import { Logo } from "./Logo";

const NAV = [
  { href: "/inbox/", label: "Inbox" },
  { href: "/try/", label: "Try It" },
  { href: "/dashboard/", label: "Dashboard" },
  { href: "/evaluation/", label: "Evaluation" },
];

export function AppBar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const health = useHealth();
  return (
    <header className="material sticky top-0 z-20 border-b border-line/70 bg-paper/75 shadow-[0_1px_0_rgba(15,15,15,0.03)] backdrop-blur-[20px] backdrop-saturate-[180%]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/" aria-label="Dokanbox home" className="shrink-0">
          <Logo size={28} />
        </Link>

        {/* static shop switcher (docs/06 §4.2) */}
        <span className="hidden rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted md:inline">
          Rina&apos;s Fashion House · Page
        </span>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto" aria-label="Sections">
          {NAV.map((n) => {
            const active = pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                  active ? "bg-ink text-paper" : "text-muted hover:bg-line/60 hover:text-ink"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 ml-auto flex items-center gap-4 md:order-none">
          {children}
          <HealthDot health={health} />
        </div>
      </div>
    </header>
  );
}
