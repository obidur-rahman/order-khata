import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Noto_Sans_Bengali } from "next/font/google";

import { LANG_KEY } from "@/lib/prefKeys";

import "./globals.css";

// "The spread" (DESIGN.md): one family, two personalities. Archivo carries the
// display voice on its width axis and the text voice at normal width; Plex Mono
// is the machine layer; Noto Sans Bengali carries Bangla at every size.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
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

const DESC =
  "Sorts every Bangla, Banglish or English customer message into six classes with a calibrated confidence, and keeps the risky calls with you.";

export const metadata: Metadata = {
  title: {
    default: "Order Khata: your shop's inbox, sorted",
    template: "%s · Order Khata",
  },
  description: DESC,
  applicationName: "Order Khata",
  keywords: ["Bangla", "e-commerce", "inbox", "triage", "classification", "Bangladesh"],
  openGraph: {
    title: "Order Khata: your shop's inbox, sorted",
    description: DESC,
    siteName: "Order Khata",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Order Khata: sort the noise, keep the sale" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Order Khata: your shop's inbox, sorted",
    description: DESC,
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.ico" },
};

/** Dark-only: the `dark` class ships in the server markup below, so there is
 *  nothing to flip and no flash by construction. This only restores the
 *  visitor's language before the first paint. */
const NO_FLASH = `(function(){try{
if(localStorage.getItem(${JSON.stringify(LANG_KEY)})==="bn")document.documentElement.lang="bn";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${archivo.variable} ${plexMono.variable} ${bengali.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
