import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: "Wordpairs Admin",
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Wordpairs Admin",
    statusBarStyle: "default",
  },
};
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          wordpairs
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/play">Find a room</Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
