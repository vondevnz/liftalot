import { describe, expect, it } from "vitest";
import { buildWeeks, DAYS_SHOWN, monthSegments } from "./heatmap";
import { dayOfWeek } from "./date";

describe("buildWeeks", () => {
  // 2026-08-17 is a Monday.
  const today = "2026-08-17";

  it("emits whole weeks", () => {
    for (const week of buildWeeks(today)) {
      expect(week).toHaveLength(7);
    }
  });

  it("starts on a Sunday so the M/W/F labels line up", () => {
    const first = buildWeeks(today)[0][0];
    expect(first).not.toBeNull();
    expect(dayOfWeek(first!)).toBe(0);
  });

  it("ends on today, with the rest of the current week padded out", () => {
    const weeks = buildWeeks(today);
    const last = weeks[weeks.length - 1];
    // Monday is index 1; Tue–Sat have not happened yet.
    expect(last[1]).toBe(today);
    expect(last.slice(2)).toEqual([null, null, null, null, null]);
  });

  it("covers at least the requested window", () => {
    const dates = buildWeeks(today).flat().filter(Boolean);
    expect(dates.length).toBeGreaterThanOrEqual(DAYS_SHOWN);
    expect(dates.length).toBeLessThanOrEqual(DAYS_SHOWN + 6);
  });

  it("stays narrow enough to fit a phone without scrolling", () => {
    // 14 columns at a 22px pitch is ~308px, against the ~304px a 390px phone
    // leaves after padding and the weekday gutter. Widening the window or the
    // cells past this brings horizontal scrolling back.
    expect(buildWeeks(today).length).toBeLessThanOrEqual(14);
  });

  it("honours an explicit window", () => {
    const dates = buildWeeks(today, 30).flat().filter(Boolean);
    expect(dates.length).toBeGreaterThanOrEqual(30);
    expect(dates.length).toBeLessThanOrEqual(36);
  });

  it("has no gaps or duplicates", () => {
    const dates = buildWeeks(today).flat().filter(Boolean) as string[];
    expect(new Set(dates).size).toBe(dates.length);
    expect([...dates].sort()).toEqual(dates);
  });

  it("pads nothing when today is a Saturday", () => {
    const weeks = buildWeeks("2026-08-22"); // Saturday
    expect(weeks[weeks.length - 1].every(Boolean)).toBe(true);
  });
});

describe("monthSegments", () => {
  const segments = monthSegments(buildWeeks("2026-08-17"));

  it("accounts for every column exactly once", () => {
    const total = segments.reduce((n, s) => n + s.weeks, 0);
    expect(total).toBe(buildWeeks("2026-08-17").length);
  });

  it("never repeats a month back to back", () => {
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].label).not.toBe(segments[i - 1].label);
    }
  });

  it("ends in the current month", () => {
    expect(segments[segments.length - 1].label).toBe("Aug");
  });

  it("spans three or four month runs across the window", () => {
    expect(segments.length).toBeGreaterThanOrEqual(3);
    expect(segments.length).toBeLessThanOrEqual(5);
  });

  it("starts in the month three back", () => {
    // 92 days before 2026-08-17 lands in May.
    expect(segments[0].label).toBe("May");
  });
});
