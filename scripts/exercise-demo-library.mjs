/** Admin-only batch publishing. Never calls an image generation provider. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [action, key, file, guideFile] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret)
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local administrator environment. Never put these in VITE_ variables.",
  );
const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function rpc(p_action, options = {}) {
  const { data, error } = await client.rpc("exercise_demo_admin", {
    p_action,
    p_key: key,
    ...options,
  });
  if (error) throw new Error(error.message);
  return data;
}
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (action === "list") {
  console.log(JSON.stringify(await rpc("list"), null, 2));
} else if (action === "stage") {
  if (!key || !file || !guideFile)
    throw new Error("Usage: stage <key> <image.png|webp> <guide.json>");
  const entries = await rpc("list");
  const entry = entries.find((item) => item.key === key);
  if (!entry)
    throw new Error("Missing request or already published. Existing media is never overwritten.");
  const extension = extname(file).toLowerCase();
  if (![".png", ".webp"].includes(extension)) throw new Error("PNG or WebP required");
  const bytes = await readFile(file);
  if (bytes.length > 10485760) throw new Error("Maximum file size: 10 MiB");
  const guide = JSON.parse(await readFile(guideFile, "utf8"));
  if (
    typeof guide.title !== "string" ||
    !Array.isArray(guide.steps) ||
    guide.steps.length < 2 ||
    !guide.steps.every((step) => typeof step === "string" && step.trim()) ||
    typeof guide.mistake !== "string"
  )
    throw new Error("A title, at least two instructions and a mistake are required");
  const path = `${entry.id}/demo${extension}`;
  if (entry.asset_path && entry.asset_path !== path)
    throw new Error("A draft already exists with a different format. Reuse it.");
  const store = client.storage.from("exercise-demo-library");
  const { error } = await store.upload(path, bytes, {
    contentType: extension === ".png" ? "image/png" : "image/webp",
    upsert: false,
  });
  if (error) {
    // An interrupted import may resume, but only with the exact same bytes.
    const { data: existing, error: downloadError } = await store.download(path);
    if (
      downloadError ||
      !existing ||
      digest(Buffer.from(await existing.arrayBuffer())) !== digest(bytes)
    )
      throw new Error(
        "Upload failed or a different image already exists. Nothing was overwritten.",
      );
  }
  console.log(
    JSON.stringify(await rpc("stage", { p_guide: { ...guide, file: `demo${extension}` } })),
  );
} else if (action === "approve") {
  if (file !== "--reviewed")
    throw new Error(
      "Review both positions, equipment, anatomy and instructions first, then use approve <key> --reviewed",
    );
  console.log(JSON.stringify(await rpc("approve")));
} else if (action === "alias") {
  const normalize = (name) =>
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’'_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  if (!file) throw new Error("Usage: alias <approved key> <verified synonym> [...synonyms]");
  console.log(
    JSON.stringify(await rpc("alias", { p_aliases: process.argv.slice(4).map(normalize) })),
  );
} else if (action === "reject") {
  console.log(JSON.stringify(await rpc("reject")));
} else {
  throw new Error(
    "Usage: list | stage <key> <image> <guide.json> | approve <key> --reviewed | alias <approved key> <synonyms...> | reject <key>",
  );
}
