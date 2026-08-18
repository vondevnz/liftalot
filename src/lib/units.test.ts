import { describe, expect, it } from "vitest";
import { displayWeight, formatWeight, fromKg, isUnit, roundForDisplay, toKg } from "./units";

describe("conversion", () => {
  it("leaves kilograms untouched", () => {
    expect(fromKg(60, "kg")).toBe(60);
    expect(toKg(60, "kg")).toBe(60);
  });

  it("converts to pounds", () => {
    expect(fromKg(100, "lb")).toBeCloseTo(220.46, 2);
  });

  it("round-trips through the numeric(6,2) column", () => {
    // 135 lb is what the user types; the column stores kilograms rounded to two
    // decimals; the display has to come back reading 135.
    const stored = Math.round(toKg(135, "lb") * 100) / 100;
    expect(displayWeight(stored, "lb")).toBe(135);
  });

  it("round-trips a range of plate-math weights", () => {
    for (const lb of [45, 95, 135, 185, 225, 315, 405]) {
      const stored = Math.round(toKg(lb, "lb") * 100) / 100;
      expect(displayWeight(stored, "lb")).toBe(lb);
    }
  });
});

describe("roundForDisplay", () => {
  it("keeps kilograms to two decimals", () => {
    expect(roundForDisplay(61.239, "kg")).toBe(61.24);
  });

  it("keeps pounds to one", () => {
    expect(roundForDisplay(135.0111, "lb")).toBe(135);
  });
});

describe("formatWeight", () => {
  it("labels the unit", () => {
    expect(formatWeight(60, "kg")).toBe("60 kg");
    expect(formatWeight(61.24, "lb")).toBe("135 lb");
  });

  it("drops a trailing zero", () => {
    expect(formatWeight(60.0, "kg")).toBe("60 kg");
  });

  it("keeps a real half-kilo", () => {
    expect(formatWeight(62.5, "kg")).toBe("62.5 kg");
  });

  it("returns null for a bodyweight movement", () => {
    expect(formatWeight(null, "kg")).toBeNull();
    expect(formatWeight(null, "lb")).toBeNull();
  });
});

describe("isUnit", () => {
  it("accepts only the two units", () => {
    expect(isUnit("kg")).toBe(true);
    expect(isUnit("lb")).toBe(true);
    expect(isUnit("stone")).toBe(false);
    expect(isUnit(null)).toBe(false);
    expect(isUnit(undefined)).toBe(false);
  });
});
