import Link from "next/link";
import { oidcAvailable } from "../../infrastructure/runtime";
import { ContentScreen } from "../../web/content-panel";
export const dynamic = "force-dynamic";
export default function ContentPage() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          wordpairs
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/play">Find a room</Link>
          <Link href="/">Community board</Link>
        </nav>
      </header>
      <ContentScreen oidcEnabled={oidcAvailable()} />
    </main>
  );
}
