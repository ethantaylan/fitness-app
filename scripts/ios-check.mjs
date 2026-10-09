import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { loadEnv } from "vite-plus";
import sharp from "sharp";

const env = { ...loadEnv("native", process.cwd(), ""), ...process.env };
let failures = 0;
function check(ok, label) {
  console.log(`${ok ? "OK" : "BLOCKED"} ${label}`);
  if (!ok) failures++;
}
function publicHttps(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

check(Number(process.versions.node.split(".")[0]) >= 22, "Node.js 22+");
check(publicHttps(env.VITE_APP_URL), "Public HTTPS URL");
check(
  !!env.VITE_PUBLISHER_NAME && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.VITE_SUPPORT_EMAIL ?? ""),
  "Publisher and support contact",
);
check(
  publicHttps(env.VITE_SUPABASE_URL) && !env.VITE_SUPABASE_URL.includes("xxxx"),
  "Supabase production endpoint",
);
const key = env.VITE_SUPABASE_ANON_KEY ?? "";
let publicKey = key.startsWith("sb_publishable_");
try {
  publicKey ||= JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "anon";
} catch {
  /* Invalid keys are rejected below. */
}
check(publicKey, "Supabase public key (never service_role)");
check(
  !Object.keys(env).some((name) => /^VITE_.*(SERVICE_ROLE|SECRET|OPENAI_API_KEY)/.test(name)),
  "No server secrets exposed through VITE_",
);
const nativeConfig = "ios/App/App/capacitor.config.json";
check(existsSync(nativeConfig), "Native assets synced with ios:prepare");
if (existsSync(nativeConfig)) {
  const config = JSON.parse(readFileSync(nativeConfig, "utf8"));
  check(
    !config.server?.url && !config.server?.cleartext,
    "Bundled application; no remote development server",
  );
}
check(existsSync("ios/App/App/public/index.html"), "Bundled index.html");
const project = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
check(
  project.includes("PrivacyInfo.xcprivacy in Resources"),
  "Privacy manifest in Xcode resources",
);
const metadata = await sharp(
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
).metadata();
check(
  metadata.width === 1024 && metadata.height === 1024 && !metadata.hasAlpha,
  "Opaque 1024px App Store icon",
);
try {
  const xcode = execFileSync("xcodebuild", ["-version"], { encoding: "utf8" });
  check(
    Number(xcode.match(/Xcode (\d+)/)?.[1] ?? 0) >= 26,
    "Xcode 26+ (iOS 26 SDK required for submission)",
  );
  const sdk = execFileSync("xcrun", ["--sdk", "iphoneos", "--show-sdk-version"], {
    encoding: "utf8",
  });
  check(Number(sdk.split(".")[0]) >= 26, "iOS SDK 26+");
  execFileSync(
    "plutil",
    [
      "-lint",
      "ios/App/App/Info.plist",
      "ios/App/App/PrivacyInfo.xcprivacy",
      "ios/App/App.xcodeproj/project.pbxproj",
    ],
    { stdio: "inherit" },
  );
} catch {
  check(false, "Xcode and valid native property lists required on macOS");
}
if (process.argv.includes("--signing"))
  check(/^[A-Z0-9]{10}$/.test(env.APPLE_TEAM_ID ?? ""), "APPLE_TEAM_ID configured for signing");
console.log(
  "Manual gates: deployed backend, public legal pages, App Privacy labels, device/TestFlight QA and Apple review account. See docs/APP_STORE.md.",
);
process.exitCode = failures ? 1 : 0;
