/**
 * Optimize gallery images: convert all PNG/JPG to WebP.
 * Only runs in CI; skips locally to preserve original quality.
 * Reduces public/gallery/ from ~78MB to ~15MB.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const GALLERY_DIR = path.join(process.cwd(), "public", "gallery");
const QUALITY = 82; // WebP quality (0-100), 82 is a good balance

if (!fs.existsSync(GALLERY_DIR)) {
  console.log("No gallery directory, skipping optimization.");
  process.exit(0);
}

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) return false;

  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, ext);
  const webpPath = path.join(dir, `${baseName}.webp`);

  // Skip if WebP already exists and is newer
  if (fs.existsSync(webpPath)) {
    const srcStat = fs.statSync(filePath);
    const webpStat = fs.statSync(webpPath);
    if (webpStat.mtime >= srcStat.mtime) {
      return false; // already optimized
    }
  }

  try {
    await sharp(filePath)
      .webp({ quality: QUALITY, effort: 4 })
      .toFile(webpPath);

    // Delete original
    fs.unlinkSync(filePath);

    const srcSize = (fs.statSync(webpPath).size / 1024).toFixed(0);
    console.log(`  ✓ ${path.basename(filePath)} → ${baseName}.webp (${srcSize}KB)`);
    return true;
  } catch (err) {
    console.error(`  ✗ Failed: ${path.basename(filePath)} — ${err.message}`);
    return false;
  }
}

async function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  console.log("🎨 Optimizing gallery images...");

  const allFiles = await walkDir(GALLERY_DIR);
  const imageFiles = allFiles.filter((f) =>
    /\.(png|jpe?g)$/i.test(f)
  );

  if (imageFiles.length === 0) {
    console.log("  No images to optimize.");
    return;
  }

  console.log(`  Found ${imageFiles.length} images to optimize...`);
  let count = 0;

  for (const file of imageFiles) {
    if (await optimizeFile(file)) count++;
  }

  // Check size reduction
  const remainingFiles = await walkDir(GALLERY_DIR);
  const totalSize = remainingFiles.reduce(
    (sum, f) => sum + fs.statSync(f).size,
    0
  );
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);

  console.log(`✅ Optimized ${count} images. Gallery size: ${sizeMB}MB`);
}

main().catch((err) => {
  console.error("Optimization failed:", err);
  process.exit(1);
});
