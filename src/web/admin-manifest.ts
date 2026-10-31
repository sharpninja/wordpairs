import type { MetadataRoute } from "next";

export default function adminManifest(): MetadataRoute.Manifest {
  return {
    id: "/admin",
    name: "Wordpairs Admin",
    short_name: "Wordpairs Admin",
    description: "Private Wordpairs administration for sharpninja.",
    lang: "en",
    start_url: "/admin",
    scope: "/admin",
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
