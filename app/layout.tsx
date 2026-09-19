import type { Metadata } from "next";
import { Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/session";

const barlow = Barlow_Condensed({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CODM Command Center",
    template: "%s · CODM Command Center",
  },
  description:
    "Community-run 1v1 ladder and rankings for Call of Duty Mobile. Verified matches, transparent CCP standing, seasonal tournaments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${barlow.variable} ${jetbrains.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}