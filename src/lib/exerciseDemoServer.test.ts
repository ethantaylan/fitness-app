import { expect, test, vi } from "vite-plus/test";
import { findBuiltinGuide, resolveDemo } from "../../supabase/functions/exercise-demo/library";

test("bundled aliases reuse their original illustration", () => {
  expect(findBuiltinGuide("Développé couché haltères")?.id).toBe("bench-press-dumbbell");
  expect(findBuiltinGuide("Squat au poids du corps")).toBeNull();
});
test("pending and rejected media never get signed, ready media is reused", async () => {
  const sign = vi
    .fn()
    .mockResolvedValue({ data: { signedUrl: "https://fixture.test/signed" }, error: null });
  const admin = {
    rpc: vi.fn().mockResolvedValue({ data: { status: "pending" }, error: null }),
    storage: { from: vi.fn(() => ({ createSignedUrl: sign })) },
  };
  expect(await resolveDemo(admin, "user", "Name", "name", true)).toEqual({ status: "pending" });
  expect(sign).not.toHaveBeenCalled();
  admin.rpc.mockResolvedValue({
    data: {
      status: "ready",
      guide: { title: "Name", steps: ["A", "B"] },
      assetPath: "one/demo.webp",
    },
    error: null,
  });
  const result = await resolveDemo(admin, "second-user", "Name", "name", true);
  expect(result.guide.images).toEqual(["https://fixture.test/signed"]);
  expect(sign).toHaveBeenCalledWith("one/demo.webp", 3600);
});
