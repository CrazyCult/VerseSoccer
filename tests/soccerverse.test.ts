import { describe, expect, it } from "vitest";

describe("Soccerverse configuration", () => {
  it("uses the documented public API by default", async () => {
    const { soccerverseApiBaseUrl } = await import("../lib/soccerverse");
    expect(soccerverseApiBaseUrl).toBe("https://services.soccerverse.com/api");
  });
});
