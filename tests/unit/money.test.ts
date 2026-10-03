import { describe, expect, it } from "vitest";
import {
  applyBp,
  bpToInput,
  formatBp,
  formatPence,
  parsePercent,
  parsePounds,
  penceToInput,
  roundDiv,
} from "@/domain/money";

describe("roundDiv (half away from zero)", () => {
  it.each([
    [5, 2, 3],
    [4, 2, 2],
    [7, 3, 2],
    [8, 3, 3],
    [-5, 2, -3],
    [-7, 3, -2],
    [0, 7, 0],
    [1, 3, 0],
    [3, 2, 2],
  ])("roundDiv(%i, %i) = %i", (n, d, out) => expect(roundDiv(n, d)).toBe(out));

  it("rejects non-integers and zero divisor", () => {
    expect(() => roundDiv(1.5, 2)).toThrow();
    expect(() => roundDiv(1, 0)).toThrow();
  });

  it("never returns -0", () => {
    expect(Object.is(roundDiv(-1, 3), 0)).toBe(true);
  });
});

describe("applyBp", () => {
  it("computes 20% VAT with half-up rounding", () => {
    expect(applyBp(1000, 2000)).toBe(200);
    expect(applyBp(1, 2000)).toBe(0); // 0.2p -> 0
    expect(applyBp(3, 2000)).toBe(1); // 0.6p -> 1
    expect(applyBp(1234, 2000)).toBe(247); // 246.8 -> 247
    expect(applyBp(1237, 2000)).toBe(247); // 247.4 -> 247
    expect(applyBp(1238, 2000)).toBe(248); // 247.6 -> 248
    expect(applyBp(25, 2000)).toBe(5);
    expect(applyBp(2, 2500)).toBe(1); // exactly 0.5 -> 1
  });
  it("0% is always 0", () => expect(applyBp(99999, 0)).toBe(0));
  it("avoids float drift that naive maths gets wrong", () => {
    // 1.005 * 100 in floats is 100.49999...; integer maths is exact.
    expect(applyBp(1005, 10000)).toBe(1005);
    expect(applyBp(1005, 5000)).toBe(503); // 502.5 -> 503
  });
});

describe("formatting and parsing", () => {
  it("formats GBP", () => {
    expect(formatPence(123456)).toBe("£1,234.56");
    expect(formatPence(5)).toBe("£0.05");
    expect(formatPence(-1250)).toBe("-£12.50");
  });
  it("formats percentages", () => {
    expect(formatBp(2000)).toBe("20%");
    expect(formatBp(1750)).toBe("17.5%");
    expect(formatBp(1225)).toBe("12.25%");
  });
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.50", 1250],
    ["£1,234.56", 123456],
    ["0.07", 7],
    ["-3.10", -310],
  ])("parsePounds(%s) = %i", (s, p) => expect(parsePounds(s)).toBe(p));
  it.each(["", "abc", "1.234", "1.2.3", "£"])("parsePounds(%s) is null", (s) =>
    expect(parsePounds(s)).toBeNull(),
  );
  it("parses percents to bp", () => {
    expect(parsePercent("15")).toBe(1500);
    expect(parsePercent("17.5%")).toBe(1750);
    expect(parsePercent("-2.25")).toBe(-225);
    expect(parsePercent("1.234")).toBeNull();
  });
  it("round-trips inputs", () => {
    expect(penceToInput(1250)).toBe("12.50");
    expect(penceToInput(-5)).toBe("-0.05");
    expect(bpToInput(1750)).toBe("17.5");
    expect(bpToInput(1500)).toBe("15");
    expect(bpToInput(1225)).toBe("12.25");
    expect(parsePercent(bpToInput(-1205))).toBe(-1205);
  });
});
