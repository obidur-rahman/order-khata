/** 404 — server component so the exported 404.html carries real metadata. */
import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = {
  title: { absolute: "404 — Page not in the ledger | Order Khata" },
  description: "This page was never in the ledger.",
  alternates: { canonical: "/404" },
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundView />;
}
