import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Inter, Noto_Sans_Bengali } from "next/font/google";

import { LANG_KEY, THEME_KEY } from "@/lib/prefKeys";

import "./globals.css";

// docs/06 §3: Bricolage Grotesque (display), Inter (body), IBM Plex Mono
// (label / index layer), Noto Sans Bengali (Bangla fallback) — loaded at
// build time via next/font.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});
const bengali = Noto_Sans_Bengali({
  weight: ["400", "500", "600"],
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Order Khata: Your shop's inbox, sorted.",
  description:
    "Reads every customer message in Bangla, Banglish or English, sorts it into six classes with a calibrated confidence, auto-handles the clear ones, and keeps the risky decisions with you.",
};

/** Apply the saved language and theme before the first paint. Without this
 *  the page flashes light English for a moment on every load.
 *  Runs before React exists, so it is a plain string; the keys come from
 *  lib/prefKeys.ts so the names cannot drift from lib/prefs.ts. */
const NO_FLASH = `(function(){try{var d=document.documentElement,s=localStorage;
var th=s.getItem(${JSON.stringify(THEME_KEY)}),lg=s.getItem(${JSON.stringify(LANG_KEY)});
if(th==="dark")d.classList.add("dark");d.style.colorScheme=th==="dark"?"dark":"light";
if(lg==="bn")d.lang="bn";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${inter.variable} ${plexMono.variable} ${bengali.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
