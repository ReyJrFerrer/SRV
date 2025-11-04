#!/usr/bin/env node
// Simple icon generator: converts public/logo.svg -> apple-touch PNGs using sharp.
// Usage: node scripts/generate-apple-icons.js

import fs from "fs";
import path from "path";

async function main() {
  const root = path.resolve(import.meta.url.replace("file://", ""), "../../");
  const publicDir = path.resolve(root, "public");
  const svgPath = path.join(publicDir, "logo.svg");

  // sizes we want to generate
  const sizes = [180, 167, 152, 120];

  if (!fs.existsSync(svgPath)) {
    console.error(
      "logo.svg not found in public/. Please add your logo.svg to src/frontend/public/logo.svg and re-run.",
    );
    process.exit(1);
  }

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch (e) {
    console.error(
      "Missing dependency 'sharp'. Run 'npm install --workspace src/frontend sharp --save-dev' or install it in src/frontend and try again.",
    );
    process.exit(1);
  }

  for (const s of sizes) {
    const out = path.join(publicDir, `apple-touch-icon-${s}.png`);
    try {
      await sharp(svgPath)
        .resize(s, s, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(out);
      console.log(`Wrote ${out}`);
    } catch (err) {
      console.error(`Failed to generate ${out}:`, err);
    }
  }

  // also write a generic apple-touch-icon.png (180 fallback)
  const fallback = path.join(publicDir, `apple-touch-icon.png`);
  try {
    await sharp(svgPath)
      .resize(180, 180, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(fallback);
    console.log(`Wrote ${fallback}`);
  } catch (err) {
    console.error(`Failed to generate ${fallback}:`, err);
  }

  // Note: safari-pinned-tab.svg should be provided by the designer (monochrome),
  // we don't auto-generate it here.
}

main();
