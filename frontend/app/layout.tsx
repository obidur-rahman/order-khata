import type { Metadata } from "next";
import { Inter, Noto_Sans_Bengali, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

// docs/06 §3: Plus Jakarta Sans (display), Inter (body), Noto Sans Bengali
// (Bangla fallback) — loaded at build time via next/font.
const jakarta = Plus_Jakarta_Sans({
  weight: ["700", "800"],
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const bengali = Noto_Sans_Bengali({
  weight: ["400", "500", "600"],
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dokanbox — Your shop's inbox, sorted.",
  description:
    "Reads every customer message in Bangla, Banglish or English, sorts it, and keeps the risky decisions with you.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${inter.variable} ${bengali.variable}`}>
        {children}
      </body>
    </html>
  );
}
