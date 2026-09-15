import { describe, it, expect } from "vitest";
import { activeStatus, safeUrl, duration } from "@/lib/actions";
describe("Actions presentation and links", () => {
  it("blocks executable and insecure report URLs", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("http://example.com")).toBeUndefined();
    expect(safeUrl("https://example.com/report")).toBe(
      "https://example.com/report",
    );
  });
  it("distinguishes active and terminal GitHub and legacy states", () => {
    for (const status of ["queued", "in_progress", "em_execucao"])
      expect(activeStatus(status)).toBe(true);
    for (const status of [
      "success",
      "failure",
      "cancelled",
      "passed",
      "failed",
    ])
      expect(activeStatus(status)).toBe(false);
  });
  it("renders completed duration and missing metrics", () => {
    expect(
      duration({
        status: "success",
        started_at: null,
        created_at: "",
        duration_ms: 65000,
      }),
    ).toBe("1m 5s");
    expect(
      duration({
        status: "failure",
        started_at: null,
        created_at: "",
        duration_ms: null,
      }),
    ).toBe("—");
  });
});
