import { expect, test, vi } from "vite-plus/test";
import {
  demonstrationPrompt,
  generateMissingDemo,
} from "../../supabase/functions/exercise-demo/generation";

function fixture() {
  let reserved = false;
  let stored = false;
  let completed = false;
  let failFinalization = false;
  const rpc = vi.fn(async (method, args) => {
    if (method === "exercise_demo_claim") {
      if (completed) return { data: null };
      const claimed = !reserved;
      reserved = true;
      return {
        data: { claimed, id: "one", key: "burpees", title: "Burpees", token: "attempt-one" },
      };
    }
    if (args.p_error) return { data: true };
    if (failFinalization) return { data: false, error: { message: "offline" } };
    completed = stored;
    return { data: completed };
  });
  const upload = vi.fn(async () => {
    stored = true;
    return { error: null };
  });
  const download = vi.fn(async () => ({ data: stored ? new Blob(["fixture"]) : null }));
  const admin = { rpc, storage: { from: () => ({ upload, download }) } };
  const provider = vi.fn(async () =>
    Response.json({
      data: [{ b64_json: btoa(String.fromCharCode(137, 80, 78, 71, 13, 10, 26, 10, 0)) }],
    }),
  );
  return {
    admin,
    provider,
    upload,
    setFailFinalization: (value: boolean) => {
      failFinalization = value;
    },
  };
}

test("concurrent accounts and subsequent consultations send at most one paid request", async () => {
  const f = fixture();
  await Promise.all([
    generateMissingDemo(f.admin, "first", "Burpees", "burpees", "fixture-key", f.provider),
    generateMissingDemo(f.admin, "second", "Burpees", "burpees", "fixture-key", f.provider),
  ]);
  await generateMissingDemo(f.admin, "third", "Burpees", "burpees", "fixture-key", f.provider);
  expect(f.provider).toHaveBeenCalledTimes(1);
  expect(f.upload).toHaveBeenCalledTimes(1);
  expect(f.provider).toHaveBeenCalledWith(
    "https://api.openai.com/v1/images/generations",
    expect.objectContaining({ body: expect.stringContaining('"n":1') }),
  );
  expect(f.provider).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ body: expect.stringContaining('"model":"gpt-image-2"') }),
  );
});
test("provider timeout consumes the attempt permanently", async () => {
  const f = fixture();
  f.provider.mockRejectedValue(new Error("timeout"));
  await generateMissingDemo(f.admin, "first", "Burpees", "burpees", "fixture-key", f.provider);
  await generateMissingDemo(f.admin, "second", "Burpees", "burpees", "fixture-key", f.provider);
  expect(f.provider).toHaveBeenCalledTimes(1);
  expect(f.upload).not.toHaveBeenCalled();
  expect(f.admin.rpc).toHaveBeenCalledWith(
    "exercise_demo_generated",
    expect.objectContaining({ p_error: "generation_interrupted" }),
  );
});
test("interrupted finalization reuses the stored PNG without another provider call", async () => {
  const f = fixture();
  f.setFailFinalization(true);
  await generateMissingDemo(f.admin, "first", "Burpees", "burpees", "fixture-key", f.provider);
  f.setFailFinalization(false);
  await generateMissingDemo(f.admin, "second", "Burpees", "burpees", "fixture-key", f.provider);
  expect(f.provider).toHaveBeenCalledTimes(1);
  expect(f.upload).toHaveBeenCalledTimes(1);
});
test("missing credentials cannot consume an attempt and prompt treats names as data", async () => {
  const f = fixture();
  await generateMissingDemo(f.admin, "first", "Burpees", "burpees", "", f.provider);
  expect(f.admin.rpc).not.toHaveBeenCalled();
  expect(demonstrationPrompt('Squat "haltères"')).toContain(JSON.stringify('Squat "haltères"'));
});
