import Link from "next/link";
import type { ReactNode } from "react";
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          wordpairs
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/play">Find a room</Link>
          <Link href="/content">Community content</Link>
        </nav>
      </header>
      <nav className="admin-nav" aria-label="Administration">
        <Link href="/admin">Moderation</Link>
        <Link href="/admin/words">Word pairs and hints</Link>
        <Link href="/admin/users">Users and access</Link>
      </nav>
      {children}
    </main>
  );
}
