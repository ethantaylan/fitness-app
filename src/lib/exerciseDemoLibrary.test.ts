import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("./aiConsent", () => ({
  requestAIConsent: vi.fn().mockResolvedValue(true),
  AI_CONSENT_VERSION: "2026-10-08",
}));
vi.mock("./supabase", () => ({ supabase: { functions: { invoke } } }));

beforeEach(() => {
  vi.resetModules();
  invoke.mockReset();
});
describe("shared demonstration requests", () => {
  it("coalesces concurrent normalized names and caches requests without invoking an image provider", async () => {
    let release!: (value: unknown) => void;
    invoke.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const { requestExerciseDemo } = await import("./exerciseDemoLibrary");
    const first = requestExerciseDemo("Fentes arrière");
    const second = requestExerciseDemo("  FENTES ARRIERE  ");
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    release({ data: { status: "pending" }, error: null });
    expect(await first).toEqual({ status: "pending" });
    expect(await second).toEqual({ status: "pending" });
    await requestExerciseDemo("Fentes arrière");
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      "exercise-demo",
      expect.objectContaining({
        body: {
          action: "request",
          name: "Fentes arrière",
          automatic: true,
          consentVersion: "2026-10-08",
        },
      }),
    );
  });
  it("does not cache failures forever and refuses unrelated remote image origins", async () => {
    const { requestExerciseDemo, isLibraryGuide } = await import("./exerciseDemoLibrary");
    invoke
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ data: { status: "pending" }, error: null });
    expect(await requestExerciseDemo("Squat sans charge")).toEqual({ status: "unavailable" });
    expect(await requestExerciseDemo("Squat sans charge")).toEqual({ status: "pending" });
    expect(
      isLibraryGuide({
        id: "one",
        title: "Test",
        steps: ["A", "B"],
        mistake: "C",
        images: ["https://tracker.invalid/image.png"],
        source: "vincere",
        layout: "pair",
      }),
    ).toBe(false);
  });
});
