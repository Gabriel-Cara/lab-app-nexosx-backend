import {
  getExpectedExitTime,
  getInitialVisitStatus,
  normalizeAllowedHours,
} from "@/services/visitors/visitor-workflow";

describe("visitor-workflow", () => {
  it("starts timed visitors as pending", () => {
    expect(getInitialVisitStatus(false)).toBe("pending");
  });

  it("starts unlimited-access visitors as authorized", () => {
    expect(getInitialVisitStatus(true)).toBe("authorized");
  });

  it("clears allowed hours for unlimited access", () => {
    expect(normalizeAllowedHours(true, 8)).toBeNull();
    expect(normalizeAllowedHours(false, 8)).toBe(8);
  });

  it("calculates the expected exit time from entry time and hours", () => {
    const entryTime = new Date("2026-03-25T10:00:00.000Z");

    expect(getExpectedExitTime(3, entryTime)?.toISOString()).toBe(
      "2026-03-25T13:00:00.000Z",
    );
    expect(getExpectedExitTime(null, entryTime)).toBeNull();
  });
});
