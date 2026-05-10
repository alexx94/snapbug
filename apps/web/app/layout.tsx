import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snapbug - Fix Bugs Faster",
  description: "Dual-mode bug reporting with screenshots, console logs, and production-safe issue reports.",
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" }
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Rubik:wght@400;500&family=Space+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
