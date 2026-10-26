import { oidcAvailable } from "../../../infrastructure/runtime";
import { RoomScreen } from "../../../web/room-screen";
export const dynamic = "force-dynamic";
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { reference } = await params;
  const { invite } = await searchParams;
  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="/">
          wordpairs
        </a>
        <nav aria-label="Main navigation">
          <a href="/play">Find a room</a>
        </nav>
      </header>
      <RoomScreen
        reference={reference}
        invitation={typeof invite === "string" ? invite : null}
        oidcEnabled={oidcAvailable()}
      />
    </main>
  );
}
