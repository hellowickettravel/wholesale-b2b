import { describe, expect, it } from "vitest";
import { splitBySupplier } from "@/domain/split";
import { isOrderLocked, paymentStatus, rollupOrderStatus } from "@/domain/status";
import {
  addDays,
  daysBetween,
  deliveryDateOptions,
  formatShortDate,
  isDeliverable,
  isIsoDate,
  promisedPayDate,
  todayInLondon,
  weekdayOf,
} from "@/domain/dates";

describe("splitBySupplier", () => {
  it("groups stably by first appearance", () => {
    const groups = splitBySupplier([
      { id: 1, supplierId: "shrivi" },
      { id: 2, supplierId: "nitya" },
      { id: 3, supplierId: "shrivi" },
    ]);
    expect(groups.map((g) => g.supplierId)).toEqual(["shrivi", "nitya"]);
    expect(groups[0].lines.map((l) => l.id)).toEqual([1, 3]);
  });
  it("requires a supplier on every line", () => {
    expect(() => splitBySupplier([{ supplierId: "" }])).toThrow();
  });
});

describe("status rollup", () => {
  it.each([
    [["placed", "placed"], "placed"],
    [["sent", "placed"], "sent"],
    [["sent", "out_for_delivery"], "out_for_delivery"],
    [["delivered", "sent"], "partially_delivered"],
    [["delivered", "delivered"], "delivered"],
    [["delivered", "cancelled"], "delivered"],
    [["cancelled", "cancelled"], "cancelled"],
    [[], "cancelled"],
  ] as const)("%j -> %s", (s, out) => expect(rollupOrderStatus([...s])).toBe(out));

  it("payment status", () => {
    expect(paymentStatus(1000, 0)).toBe("unpaid");
    expect(paymentStatus(1000, 400)).toBe("part_paid");
    expect(paymentStatus(1000, 1000)).toBe("paid");
    expect(paymentStatus(1000, 1200)).toBe("overpaid");
  });

  it("locks after any delivery", () => {
    expect(isOrderLocked({ status: "sent" }, ["sent", "delivered"])).toBe(true);
    expect(isOrderLocked({ status: "sent" }, ["sent", "placed"])).toBe(false);
    expect(isOrderLocked({ status: "cancelled" }, [])).toBe(true);
  });
});

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
  });
  it("London today across BST midnight", () => {
    // 23:30 UTC on 5 Oct = 00:30 BST on 6 Oct
    expect(todayInLondon(new Date("2026-10-05T23:30:00Z"))).toBe("2026-10-06");
    // in winter (GMT) 23:30 UTC stays the same day
    expect(todayInLondon(new Date("2026-12-05T23:30:00Z"))).toBe("2026-12-05");
  });
  it("adds days across month/year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-10-01", "2026-10-08")).toBe(7);
  });
  it("delivery options skip today and Sundays by default", () => {
    // 2026-10-03 is a Saturday
    expect(weekdayOf("2026-10-03")).toBe(6);
    const opts = deliveryDateOptions("2026-10-03", [1, 2, 3, 4, 5, 6], 3);
    expect(opts).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
  });
  it("isDeliverable enforces lead day, weekday and horizon", () => {
    const days = [1, 2, 3, 4, 5, 6] as const;
    expect(isDeliverable("2026-10-03", "2026-10-03", [...days])).toBe(false); // same day
    expect(isDeliverable("2026-10-04", "2026-10-03", [...days])).toBe(false); // Sunday
    expect(isDeliverable("2026-10-05", "2026-10-03", [...days])).toBe(true);
    expect(isDeliverable("2027-06-01", "2026-10-03", [...days])).toBe(false); // too far
    expect(isDeliverable("nonsense", "2026-10-03", [...days])).toBe(false);
  });
  it("formats '6 Oct'", () => {
    expect(formatShortDate("2026-10-06", "2026-10-03")).toBe("6 Oct");
    expect(formatShortDate("2027-01-02", "2026-10-03")).toBe("2 Jan 2027");
  });
  it("promised pay date", () => {
    expect(promisedPayDate("on_delivery", "2026-10-06")).toBe("2026-10-06");
    expect(promisedPayDate("within_7_days", "2026-10-06")).toBe("2026-10-13");
    expect(promisedPayDate("on_date", "2026-10-06", "2026-10-20")).toBe("2026-10-20");
    expect(() => promisedPayDate("on_date", "2026-10-06")).toThrow();
  });
});

describe("formatDate", () => {
  it("uses the London calendar day", async () => {
    const { formatDate } = await import("@/domain/dates");
    expect(formatDate("2026-10-03T23:30:00Z")).toBe("4 Oct 2026");
    expect(formatDate("2026-01-15T12:00:00Z")).toBe("15 Jan 2026");
  });
});
