import { oidcAvailable } from "../../infrastructure/runtime";
import { ContentScreen } from "../../web/content-panel";
export const dynamic = "force-dynamic";
export default function ContentPage() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="/">
          wordpairs
        </a>
        <nav aria-label="Main navigation">
          <a href="/play">Find a room</a>
          <a href="/">Community board</a>
        </nav>
      </header>
      <ContentScreen oidcEnabled={oidcAvailable()} />
    </main>
  );
}
