// @ts-nocheck -- Deno imports; tested with Vite using the same pure implementation.
import guides from "../../../src/lib/exerciseGuides.json" with { type: "json" };
import { normalizeExerciseName } from "../../../src/lib/exerciseGuideKey.ts";

export function findBuiltinGuide(name: string) {
  const key = normalizeExerciseName(name);
  const guide = guides.find((item) =>
    item.aliases.some((alias) => normalizeExerciseName(alias) === key),
  );
  return guide
    ? {
        ...guide,
        source: "everkinetic",
        images: [1, 2].map((position) => `/exercises/everkinetic/${guide.id}-${position}.webp`),
      }
    : null;
}

/** Reads the shared catalogue; generation is separately reserved in the database. */
export async function resolveDemo(
  admin,
  userId: string,
  name: string,
  key: string,
  enqueue: boolean,
) {
  const { data, error } = await admin.rpc("exercise_demo_request", {
    p_user_id: userId,
    p_key: key,
    p_name: name,
    p_enqueue: enqueue,
  });
  if (error || !data) throw new Error("Library unavailable");
  if (data.status !== "ready") return { status: data.status };
  const guide = data.guide;
  if (!guide || !Array.isArray(guide.steps) || typeof guide.title !== "string")
    throw new Error("Invalid guide");
  if (!data.assetPath) return { status: "ready", guide };
  const { data: asset, error: assetError } = await admin.storage
    .from("exercise-demo-library")
    .createSignedUrl(data.assetPath, 3600);
  if (assetError || !asset?.signedUrl) throw new Error("Media unavailable");
  return {
    status: "ready",
    guide: { ...guide, source: "vincere", images: [asset.signedUrl], layout: "pair" },
  };
}
