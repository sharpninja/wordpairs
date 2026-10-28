import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

function assertManifest(m: Record<string, any>) {
  expect(m.id).toBe("/");
  expect(m.scope).toBe("/");
  expect(m.start_url).toBe("/play");
  expect(m.display).toBe("standalone");
  expect(m.name).toBe("Wordpairs");
  expect(m.short_name).toBe("Wordpairs");
  expect(m.theme_color).toBe("#142c32");
  expect(m.background_color).toBe("#f7f5ed");
  for (const size of [192, 512]) {
    expect(m.icons).toContainEqual(
      expect.objectContaining({
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any",
      }),
    );
  }
  expect(m.icons).toContainEqual(
    expect.objectContaining({
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    }),
  );
}

it("PWA-01 validates actual manifest and rejects weakened identity, launch and icon controls", async () => {
  const path = resolve("src/app/manifest.ts");
  const m = (await import(path)).default();
  assertManifest(m);
  for (const invalid of [
    { ...m, display: "browser" },
    { ...m, start_url: "/admin" },
    { ...m, id: "/random" },
    { ...m, icons: [] },
  ]) {
    expect(() => assertManifest(invalid)).toThrow();
  }
});

it("PWA-02 supplies real PNG dimensions and opaque backgrounds", async () => {
  const { default: sharp } = await import("sharp");
  for (const [name, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["maskable-512.png", 512],
    ["apple-touch-icon.png", 180],
  ] as const) {
    const file = readFileSync(resolve("public/icons", name));
    expect(file.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    const image = sharp(file);
    const meta = await image.metadata();
    expect([meta.width, meta.height]).toEqual([size, size]);
    expect((await image.stats()).isOpaque).toBe(true);
    if (name.startsWith("maskable")) {
      const { data, info } = await image
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          if (Math.hypot(x - size / 2, y - size / 2) > size * 0.4) {
            const i = (y * size + x) * info.channels;
            expect([...data.subarray(i, i + 3)]).toEqual([20, 44, 50]);
          }
        }
    }
  }
});
