import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaSupport } from "../web/pwa-support";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wordpairs",
  description: "A real-time word association game.",
  applicationName: "Wordpairs",
  appleWebApp: { capable: true, title: "Wordpairs", statusBarStyle: "default" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#142c32",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaSupport />
      </body>
    </html>
  );
}
