import { oidcAvailable } from "../../infrastructure/runtime";
import { PlayHub } from "../../web/play-hub";
export const dynamic = "force-dynamic";
export default function PlayPage() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="/">
          wordpairs
        </a>
        <nav aria-label="Main navigation">
          <a href="/">Community board</a>
        </nav>
      </header>
      <PlayHub oidcEnabled={oidcAvailable()} />
    </main>
  );
}
