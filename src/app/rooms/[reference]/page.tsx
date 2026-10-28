import Link from "next/link";
import { oidcAvailable } from "../../../infrastructure/runtime";
import { RoomScreen } from "../../../web/room-screen";
export const dynamic = "force-dynamic";
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ invite?: string; from?: string }>;
}) {
  const { reference } = await params;
  const { invite, from } = await searchParams;
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
      <RoomScreen
        reference={reference}
        invitation={typeof invite === "string" ? invite : null}
        oidcEnabled={oidcAvailable()}
        fromDiscovery={from === "discovery"}
      />
    </main>
  );
}
