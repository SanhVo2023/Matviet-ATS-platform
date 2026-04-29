/**
 * Generates favicon, apple-touch-icon, and og-image from the source MV PNGs.
 *
 * Output paths follow Next.js 15's metadata file conventions:
 *   src/app/icon.png             → favicon
 *   src/app/apple-icon.png       → apple touch icon (180×180)
 *   src/app/opengraph-image.png  → social card (1200×630)
 *
 * Source assets:
 *   public/brand/MV2.png — yellow eye + navy wordmark (primary lockup)
 *   public/brand/MV6.png — white eye + yellow wordmark (for navy bg, used for OG)
 *
 * Run with: `npm run brand:generate`
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const BRAND = {
  navy: "#13245C",
  yellow: "#FFC107",
};

// Source PNGs
const MV2 = path.join(root, "public/brand/MV2.png"); // primary lockup (light bg)
const MV6 = path.join(root, "public/brand/MV6.png"); // on-dark variant

// Destinations (Next.js metadata convention)
const ICON_OUT = path.join(root, "src/app/icon.png");
const APPLE_OUT = path.join(root, "src/app/apple-icon.png");
const OG_OUT = path.join(root, "src/app/opengraph-image.png");

async function generateFavicon() {
  // Crop the eye glyph from the top portion of MV2 (the lockup) and resize to 32×32.
  // MV2 is roughly 1024×768; the glyph occupies the upper-center.
  const meta = await sharp(MV2).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 768;
  // Crop a square centered on the upper third
  const cropSize = Math.min(w, Math.floor(h * 0.55));
  const left = Math.floor((w - cropSize) / 2);
  const top = Math.floor(h * 0.05);

  await sharp(MV2)
    .extract({ left, top, width: cropSize, height: cropSize })
    .resize(64, 64, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(ICON_OUT);
  console.log(`✓ ${path.relative(root, ICON_OUT)} (64×64)`);
}

async function generateAppleIcon() {
  // Same glyph crop, larger size, on a brand-navy rounded background for iOS home-screen.
  const meta = await sharp(MV2).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 768;
  const cropSize = Math.min(w, Math.floor(h * 0.55));
  const left = Math.floor((w - cropSize) / 2);
  const top = Math.floor(h * 0.05);

  // Crop the glyph from MV6 instead so the white-eye-on-navy looks right
  const meta6 = await sharp(MV6).metadata();
  const w6 = meta6.width ?? w;
  const h6 = meta6.height ?? h;
  const cropSize6 = Math.min(w6, Math.floor(h6 * 0.55));
  const left6 = Math.floor((w6 - cropSize6) / 2);
  const top6 = Math.floor(h6 * 0.05);

  // Build a 180×180 navy square then composite the cropped glyph
  const glyphBuf = await sharp(MV6)
    .extract({ left: left6, top: top6, width: cropSize6, height: cropSize6 })
    .resize(140, 140, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: BRAND.navy,
    },
  })
    .composite([{ input: glyphBuf, gravity: "center" }])
    .png()
    .toFile(APPLE_OUT);
  console.log(`✓ ${path.relative(root, APPLE_OUT)} (180×180 on brand-navy)`);

  // Suppress unused-var eslint warning (kept for symmetry should we want a light variant)
  void cropSize;
  void left;
  void top;
}

async function generateOgImage() {
  // 1200×630 brand-navy background with MV6 lockup centered.
  const lockupBuf = await sharp(MV6)
    .resize(720, null, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: BRAND.navy,
    },
  })
    .composite([{ input: lockupBuf, gravity: "center" }])
    .png()
    .toFile(OG_OUT);
  console.log(`✓ ${path.relative(root, OG_OUT)} (1200×630 brand-navy + MV6)`);
}

async function main() {
  console.log("Generating brand derivatives from MV2/MV6 sources...");
  await generateFavicon();
  await generateAppleIcon();
  await generateOgImage();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
