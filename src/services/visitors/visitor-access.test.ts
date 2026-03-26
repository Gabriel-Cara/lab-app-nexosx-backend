import { AppError } from "@/utils/app-error";
import {
  getResidentVisitScope,
  resolveVisitHostId,
} from "@/services/visitors/visitor-access";

describe("visitor-access", () => {
  it("scopes resident queries to their own hosted visits", () => {
    expect(
      getResidentVisitScope({ id: "resident-1", role: "resident" }),
    ).toEqual({ hostId: "resident-1" });
  });

  it("does not add host scoping for staff and admin users", () => {
    expect(getResidentVisitScope({ id: "staff-1", role: "staff" })).toEqual({});
    expect(getResidentVisitScope({ id: "admin-1", role: "admin" })).toEqual({});
  });

  it("lets staff keep the requested host id", () => {
    expect(
      resolveVisitHostId(
        { id: "staff-1", role: "staff" },
        "resident-22",
      ),
    ).toBe("resident-22");
  });

  it("forces residents to use their own host id", () => {
    expect(
      resolveVisitHostId(
        { id: "resident-1", role: "resident" },
        "resident-1",
      ),
    ).toBe("resident-1");
  });

  it("rejects residents trying to create visits for another host", () => {
    expect(() =>
      resolveVisitHostId(
        { id: "resident-1", role: "resident" },
        "resident-2",
      ),
    ).toThrow(AppError);

    expect(() =>
      resolveVisitHostId(
        { id: "resident-1", role: "resident" },
        "resident-2",
      ),
    ).toThrow("Unauthorized");
  });
});
