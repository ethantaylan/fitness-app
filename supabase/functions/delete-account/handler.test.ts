import { beforeEach, expect, test, vi } from "vite-plus/test";
import { createDeleteAccountHandler } from "./handler";

const user = { id: "authenticated-user", email: "fixture@example.test" };
const deps = {
  getUser: vi.fn(),
  isReady: vi.fn(),
  verifyPassword: vi.fn(),
  revokeSessions: vi.fn(),
  deleteUser: vi.fn(),
};
const handler = createDeleteAccountHandler(deps);
const request = (
  body: unknown = { password: "password", confirmation: "SUPPRIMER", userId: "another-user" },
  token = "Bearer valid",
) =>
  new Request("https://local.test/delete-account", {
    method: "POST",
    headers: { Authorization: token },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  deps.getUser.mockResolvedValue(user);
  deps.isReady.mockResolvedValue(true);
  deps.verifyPassword.mockResolvedValue(user);
});
test("deletes only the verified identity and revokes sessions first", async () => {
  expect((await handler(request())).status).toBe(200);
  expect(deps.deleteUser).toHaveBeenCalledWith(user.id);
  expect(deps.verifyPassword).toHaveBeenCalledWith(user.email, "password");
  expect(deps.revokeSessions.mock.invocationCallOrder[0]).toBeLessThan(
    deps.deleteUser.mock.invocationCallOrder[0],
  );
});
test("rejects unauthenticated requests", async () => {
  expect((await handler(request({}, ""))).status).toBe(401);
  expect(deps.deleteUser).not.toHaveBeenCalled();
});
test("rejects a wrong password or another identity", async () => {
  deps.verifyPassword.mockResolvedValue({ ...user, id: "other" });
  expect((await handler(request())).status).toBe(403);
  expect(deps.deleteUser).not.toHaveBeenCalled();
});
test("refuses deletion without the database migration", async () => {
  deps.isReady.mockResolvedValue(false);
  expect((await handler(request())).status).toBe(503);
  expect(deps.deleteUser).not.toHaveBeenCalled();
});
test("requires explicit confirmation", async () => {
  expect((await handler(request({ password: "password" }))).status).toBe(400);
  expect(deps.deleteUser).not.toHaveBeenCalled();
});
test("does not delete after session revocation failure", async () => {
  deps.revokeSessions.mockRejectedValue(new Error("unavailable"));
  expect((await handler(request())).status).toBe(503);
  expect(deps.deleteUser).not.toHaveBeenCalled();
});
test("never reports success when Auth deletion fails", async () => {
  deps.deleteUser.mockRejectedValue(new Error("storage ownership"));
  const response = await handler(request());
  expect(response.status).toBe(503);
  expect(await response.json()).not.toHaveProperty("deleted", true);
});
