/**
 * Generate app icons for iOS and Android from the favicon
 * Run with: node scripts/generate-app-icons.mjs
 */

import sharp from "sharp";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const SOURCE_ICON_PATH = join(projectRoot, "public/favicon.png");

// Validate source icon exists before proceeding
if (!existsSync(SOURCE_ICON_PATH)) {
  console.error(
    `❌ Source icon not found: ${SOURCE_ICON_PATH}\n` +
      `   Please ensure public/favicon.png exists before running this script.`
  );
  process.exit(1);
}

const SOURCE_ICON = SOURCE_ICON_PATH;

// Android adaptive icon sizing constants (per Android spec)
// See: https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
const ADAPTIVE_ICON_TOTAL_SIZE = 108; // Total canvas size in dp
const ADAPTIVE_ICON_SAFE_ZONE = 66; // Safe zone for icon content in dp
const ADAPTIVE_ICON_RATIO = ADAPTIVE_ICON_SAFE_ZONE / ADAPTIVE_ICON_TOTAL_SIZE;

// iOS icon background color (used when flattening transparent icons)
// iOS requires icons WITHOUT alpha channel/transparency
const IOS_ICON_BACKGROUND = { r: 48, g: 25, b: 52 }; // Dark purple matching the app theme

// Android icon sizes (launcher icons)
const ANDROID_ICONS = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
];

// Android adaptive icon foreground sizes (with padding for safe zone)
const ANDROID_FOREGROUND = [
  { folder: "mipmap-mdpi", size: 108 },
  { folder: "mipmap-hdpi", size: 162 },
  { folder: "mipmap-xhdpi", size: 216 },
  { folder: "mipmap-xxhdpi", size: 324 },
  { folder: "mipmap-xxxhdpi", size: 432 },
];

// iOS icon sizes
const IOS_ICONS = [
  { size: 20, scale: 1, filename: "AppIcon-20@1x.png" },
  { size: 20, scale: 2, filename: "AppIcon-20@2x.png" },
  { size: 20, scale: 3, filename: "AppIcon-20@3x.png" },
  { size: 29, scale: 1, filename: "AppIcon-29@1x.png" },
  { size: 29, scale: 2, filename: "AppIcon-29@2x.png" },
  { size: 29, scale: 3, filename: "AppIcon-29@3x.png" },
  { size: 40, scale: 1, filename: "AppIcon-40@1x.png" },
  { size: 40, scale: 2, filename: "AppIcon-40@2x.png" },
  { size: 40, scale: 3, filename: "AppIcon-40@3x.png" },
  { size: 60, scale: 2, filename: "AppIcon-60@2x.png" },
  { size: 60, scale: 3, filename: "AppIcon-60@3x.png" },
  { size: 76, scale: 1, filename: "AppIcon-76@1x.png" },
  { size: 76, scale: 2, filename: "AppIcon-76@2x.png" },
  { size: 83.5, scale: 2, filename: "AppIcon-83.5@2x.png" },
  { size: 1024, scale: 1, filename: "AppIcon-1024@1x.png" },
];

// iOS Contents.json for the asset catalog
const IOS_CONTENTS = {
  images: [
    { filename: "AppIcon-20@1x.png", idiom: "universal", platform: "ios", scale: "1x", size: "20x20" },
    { filename: "AppIcon-20@2x.png", idiom: "universal", platform: "ios", scale: "2x", size: "20x20" },
    { filename: "AppIcon-20@3x.png", idiom: "universal", platform: "ios", scale: "3x", size: "20x20" },
    { filename: "AppIcon-29@1x.png", idiom: "universal", platform: "ios", scale: "1x", size: "29x29" },
    { filename: "AppIcon-29@2x.png", idiom: "universal", platform: "ios", scale: "2x", size: "29x29" },
    { filename: "AppIcon-29@3x.png", idiom: "universal", platform: "ios", scale: "3x", size: "29x29" },
    { filename: "AppIcon-40@1x.png", idiom: "universal", platform: "ios", scale: "1x", size: "40x40" },
    { filename: "AppIcon-40@2x.png", idiom: "universal", platform: "ios", scale: "2x", size: "40x40" },
    { filename: "AppIcon-40@3x.png", idiom: "universal", platform: "ios", scale: "3x", size: "40x40" },
    { filename: "AppIcon-60@2x.png", idiom: "universal", platform: "ios", scale: "2x", size: "60x60" },
    { filename: "AppIcon-60@3x.png", idiom: "universal", platform: "ios", scale: "3x", size: "60x60" },
    { filename: "AppIcon-76@1x.png", idiom: "universal", platform: "ios", scale: "1x", size: "76x76" },
    { filename: "AppIcon-76@2x.png", idiom: "universal", platform: "ios", scale: "2x", size: "76x76" },
    { filename: "AppIcon-83.5@2x.png", idiom: "universal", platform: "ios", scale: "2x", size: "83.5x83.5" },
    { filename: "AppIcon-1024@1x.png", idiom: "universal", platform: "ios", scale: "1x", size: "1024x1024" },
  ],
  info: { author: "xcode", version: 1 },
};

async function generateAndroidIcons() {
  const androidResDir = join(projectRoot, "android/app/src/main/res");

  console.log("📱 Generating Android icons...");

  // Generate launcher icons
  for (const { folder, size } of ANDROID_ICONS) {
    const outputDir = join(androidResDir, folder);
    await mkdir(outputDir, { recursive: true });

    // Standard launcher icon
    await sharp(SOURCE_ICON)
      .resize(size, size)
      .png()
      .toFile(join(outputDir, "ic_launcher.png"));

    // Round launcher icon
    await sharp(SOURCE_ICON)
      .resize(size, size)
      .png()
      .toFile(join(outputDir, "ic_launcher_round.png"));

    console.log(`  ✓ ${folder}: ${size}x${size}`);
  }

  // Generate adaptive icon foregrounds (with padding for safe zone)
  for (const { folder, size } of ANDROID_FOREGROUND) {
    const outputDir = join(androidResDir, folder);
    await mkdir(outputDir, { recursive: true });

    // The foreground should be 108dp with the icon in the center 66dp area
    // This means we need to add padding: (108-66)/2 = 21dp padding on each side
    const iconSize = Math.round(size * ADAPTIVE_ICON_RATIO);
    const padding = Math.round((size - iconSize) / 2);

    await sharp(SOURCE_ICON)
      .resize(iconSize, iconSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(join(outputDir, "ic_launcher_foreground.png"));
  }

  console.log("  ✓ Adaptive icon foregrounds generated");
}

async function generateIOSIcons() {
  const iosIconDir = join(projectRoot, "ios/App/App/Assets.xcassets/AppIcon.appiconset");

  console.log("🍎 Generating iOS icons...");

  await mkdir(iosIconDir, { recursive: true });

  for (const { size, scale, filename } of IOS_ICONS) {
    const pixelSize = Math.round(size * scale);

    // iOS requires icons WITHOUT alpha channel/transparency
    // Flatten onto a background color (using the configured background color)
    await sharp(SOURCE_ICON)
      .resize(pixelSize, pixelSize)
      .flatten({ background: IOS_ICON_BACKGROUND })
      .png()
      .toFile(join(iosIconDir, filename));

    console.log(`  ✓ ${filename}: ${pixelSize}x${pixelSize}`);
  }

  // Write Contents.json
  await writeFile(
    join(iosIconDir, "Contents.json"),
    JSON.stringify(IOS_CONTENTS, null, 2)
  );

  console.log("  ✓ Contents.json updated");
}

async function main() {
  console.log("🎨 Generating app icons from favicon.png...\n");

  try {
    await generateAndroidIcons();
    console.log("");
    await generateIOSIcons();
    console.log("\n✅ All icons generated successfully!");
    console.log("\nNext steps:");
    console.log("  1. Run 'bun run cap:sync' to update native projects");
    console.log("  2. Rebuild in Xcode/Android Studio");
  } catch (error) {
    console.error("❌ Error generating icons:", error);
    process.exit(1);
  }
}

main();
