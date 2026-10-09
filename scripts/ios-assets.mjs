import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = join(root, "src/assets/logo.png");
const assets = join(root, "ios/App/App/Assets.xcassets");
const icon = await sharp(source).resize(1024, 1024, { fit: "contain" }).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: "#ffffff" } })
  .composite([{ input: icon, gravity: "centre" }])
  .removeAlpha()
  .png()
  .toFile(join(assets, "AppIcon.appiconset/AppIcon-512@2x.png"));

const logo = await sharp(source).resize(240, 240, { fit: "contain" }).png().toBuffer();
const inverted = await sharp(logo).negate({ alpha: false }).png().toBuffer();
for (const [name, background, input] of [
  ["splash-light.png", "#ffffff", logo],
  ["splash-dark.png", "#060816", inverted],
]) {
  await sharp({ create: { width: 1366, height: 1366, channels: 3, background } })
    .composite([{ input, gravity: "centre" }])
    .png()
    .toFile(join(assets, "Splash.imageset", name));
}
console.log("Vincere iOS icon and light/dark launch assets generated.");
