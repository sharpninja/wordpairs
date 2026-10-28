import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Wordpairs",
    short_name: "Wordpairs",
    description: "A real-time word association game for 2–25 players.",
    lang: "en",
    start_url: "/play",
    scope: "/",
    display: "standalone",
    background_color: "#f7f5ed",
    theme_color: "#142c32",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
