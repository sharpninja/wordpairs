import Link from "next/link";
import { oidcAvailable } from "../../infrastructure/runtime";
import { PlayHub } from "../../web/play-hub";
export const dynamic = "force-dynamic";
export default function PlayPage() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          wordpairs
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Community board</Link>
          <Link href="/content">Community content</Link>
        </nav>
      </header>
      <PlayHub oidcEnabled={oidcAvailable()} />
    </main>
  );
}
