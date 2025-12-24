import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const sourceIcon = join(publicDir, "favicon.png");

async function generateIcons() {
  console.log("Generating PWA icons from favicon.png...");

  // Standard icons (any purpose)
  await sharp(sourceIcon).resize(192, 192).png().toFile(join(publicDir, "icon-192.png"));
  console.log("✓ icon-192.png");

  await sharp(sourceIcon).resize(512, 512).png().toFile(join(publicDir, "icon-512.png"));
  console.log("✓ icon-512.png");

  // Apple touch icon
  await sharp(sourceIcon).resize(180, 180).png().toFile(join(publicDir, "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");

  // Maskable icons (need padding for safe zone - 10% on each side)
  // The safe zone is the inner 80% of the icon
  const maskableSize192 = 192;
  const maskableSize512 = 512;
  const padding192 = Math.floor(maskableSize192 * 0.1);
  const padding512 = Math.floor(maskableSize512 * 0.1);

  // Create maskable 192x192
  const iconBuffer192 = await sharp(sourceIcon)
    .resize(maskableSize192 - padding192 * 2, maskableSize192 - padding192 * 2)
    .toBuffer();

  await sharp({
    create: {
      background: { r: 18, g: 16, b: 14, alpha: 1 },
      channels: 4,
      height: maskableSize192,
      width: maskableSize192, // #12100e
    },
  })
    .composite([
      {
        input: iconBuffer192,
        left: padding192,
        top: padding192,
      },
    ])
    .png()
    .toFile(join(publicDir, "icon-maskable-192.png"));
  console.log("✓ icon-maskable-192.png");

  // Create maskable 512x512
  const iconBuffer512 = await sharp(sourceIcon)
    .resize(maskableSize512 - padding512 * 2, maskableSize512 - padding512 * 2)
    .toBuffer();

  await sharp({
    create: {
      background: { r: 18, g: 16, b: 14, alpha: 1 },
      channels: 4,
      height: maskableSize512,
      width: maskableSize512, // #12100e
    },
  })
    .composite([
      {
        input: iconBuffer512,
        left: padding512,
        top: padding512,
      },
    ])
    .png()
    .toFile(join(publicDir, "icon-maskable-512.png"));
  console.log("✓ icon-maskable-512.png");

  console.log("\nAll PWA icons generated successfully!");
}

generateIcons().catch(console.error);
