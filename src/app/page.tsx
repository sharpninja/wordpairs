import Link from "next/link";
import { getPublicService } from "../infrastructure/runtime";
import { LandingBoard } from "../web/landing-board";

export const dynamic = "force-dynamic";
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ seatLost?: string }>;
}) {
  const seatLost = (await searchParams).seatLost === "1";
  const result = seatLost ? null : await getPublicService()?.read(null, null);
  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Wordpairs home">
          <span className="brand-mark" aria-hidden="true">
            w
          </span>
          wordpairs
        </Link>
        <nav aria-label="Main navigation">
          <Link href="#rules">How to play</Link>
          <Link className="button compact" href="/play">
            Let’s play ↗
          </Link>
        </nav>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">Good words. Better company.</p>
          <h1>
            Some words just
            <br />
            belong <em>together.</em>
          </h1>
          <p className="hero-description">
            A little intuition. A few hints. A room full of connections. Put
            your word association skills to the test with friends.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/play">
              Start playing <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button secondary" href="#rules">
              Learn the rules
            </Link>
          </div>
          <p className="hero-meta">2–25 players · 8 rounds · Free to play</p>
        </div>
        <div className="word-art" aria-hidden="true">
          <div className="tiles">
            {"PAIRS".split("").map((letter, index) => (
              <span className="tile" key={letter}>
                {letter}
                <small>{index + 1}</small>
              </span>
            ))}
          </div>
          <span className="art-caption">Great minds make connections.</span>
        </div>
      </section>
      <LandingBoard
        key={seatLost ? "seat-lost" : "normal"}
        resetForSeatLoss={seatLost}
        initialData={result?.ok ? result.value.projection : null}
      />
      <footer className="footer">
        <span>Wordpairs — a game of connections.</span>
        <span>Free software · GPL-2.0-only</span>
      </footer>
    </main>
  );
}
