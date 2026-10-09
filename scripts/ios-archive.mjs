import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
run(process.execPath, ["scripts/ios-check.mjs", "--signing"]);
run("vp", ["run", "ios:prepare"]);
run("xcodebuild", [
  "-project",
  "ios/App/App.xcodeproj",
  "-scheme",
  "App",
  "-configuration",
  "Release",
  "-destination",
  "generic/platform=iOS",
  "-archivePath",
  "build/Vincere.xcarchive",
  `DEVELOPMENT_TEAM=${process.env.APPLE_TEAM_ID}`,
  "archive",
]);
