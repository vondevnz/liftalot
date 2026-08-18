import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  daysBetween,
  formatDayLabel,
  isWithinBackfillWindow,
  parseLocalDate,
  startOfWeek,
  todayLocal,
  toDateString,
} from "./date";

/**
 * Node applies a reassigned process.env.TZ to subsequent Date operations, so
 * these run the real thing rather than a mocked clock offset.
 */
function withTimezone(tz: string, instantUTC: Date, fn: () => void) {
  const previous = process.env.TZ;
  process.env.TZ = tz;
  vi.useFakeTimers();
  vi.setSystemTime(instantUTC);
  try {
    fn();
  } finally {
    vi.useRealTimers();
    process.env.TZ = previous;
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("todayLocal", () => {
  it("uses the local date late at night east of UTC, where toISOString says tomorrow", () => {
    // 2026-08-17 23:30 in Auckland (NZST, UTC+12) is 2026-08-17 11:30 UTC.
    withTimezone("Pacific/Auckland", new Date(Date.UTC(2026, 7, 17, 11, 30)), () => {
      expect(todayLocal()).toBe("2026-08-17");
    });
  });

  it("does not roll forward at 11:30pm west of UTC", () => {
    // 2026-08-17 23:30 in Los Angeles (PDT, UTC-7) is 2026-08-18 06:30 UTC.
    // This is the exact case that breaks streaks: the naive UTC slice returns
    // the 18th while the user is still living the 17th.
    withTimezone("America/Los_Angeles", new Date(Date.UTC(2026, 7, 18, 6, 30)), () => {
      expect(new Date().toISOString().slice(0, 10)).toBe("2026-08-18");
      expect(todayLocal()).toBe("2026-08-17");
    });
  });

  it("does not roll backward just after midnight east of UTC", () => {
    // 2026-08-17 00:30 Auckland is 2026-08-16 12:30 UTC.
    withTimezone("Pacific/Auckland", new Date(Date.UTC(2026, 7, 16, 12, 30)), () => {
      expect(new Date().toISOString().slice(0, 10)).toBe("2026-08-16");
      expect(todayLocal()).toBe("2026-08-17");
    });
  });
});

describe("parseLocalDate", () => {
  it("lands on local midnight, not UTC midnight", () => {
    const previous = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      const d = parseLocalDate("2026-08-17");
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(7);
      expect(d.getDate()).toBe(17);
      expect(d.getHours()).toBe(0);
      // The string constructor would have produced the 16th here.
      expect(new Date("2026-08-17").getDate()).toBe(16);
    } finally {
      process.env.TZ = previous;
    }
  });

  it("round-trips through toDateString", () => {
    expect(toDateString(parseLocalDate("2026-02-29"))).toBe("2026-03-01");
    expect(toDateString(parseLocalDate("2024-02-29"))).toBe("2024-02-29");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("advances exactly one calendar day across a spring-forward boundary", () => {
    const previous = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      // 2026-03-08 is a 23-hour day in New York.
      expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
      expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    } finally {
      process.env.TZ = previous;
    }
  });
});

describe("daysBetween", () => {
  it("counts whole days in both directions", () => {
    expect(daysBetween("2026-08-17", "2026-08-20")).toBe(3);
    expect(daysBetween("2026-08-20", "2026-08-17")).toBe(-3);
    expect(daysBetween("2026-08-17", "2026-08-17")).toBe(0);
  });

  it("survives a 23-hour DST day", () => {
    const previous = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    } finally {
      process.env.TZ = previous;
    }
  });
});

describe("startOfWeek", () => {
  it("returns the Sunday on or before the date", () => {
    // 2026-08-17 is a Monday.
    expect(startOfWeek("2026-08-17")).toBe("2026-08-16");
    expect(startOfWeek("2026-08-16")).toBe("2026-08-16");
    expect(startOfWeek("2026-08-22")).toBe("2026-08-16");
  });
});

describe("isWithinBackfillWindow", () => {
  const today = "2026-08-17";

  it("accepts today and the previous three days", () => {
    for (const d of ["2026-08-17", "2026-08-16", "2026-08-15", "2026-08-14"]) {
      expect(isWithinBackfillWindow(d, today)).toBe(true);
    }
  });

  it("rejects anything older", () => {
    expect(isWithinBackfillWindow("2026-08-13", today)).toBe(false);
  });

  it("rejects the future", () => {
    expect(isWithinBackfillWindow("2026-08-18", today)).toBe(false);
  });
});

describe("formatDayLabel", () => {
  it("reads as a weekday and short month", () => {
    expect(formatDayLabel("2026-08-17")).toBe("Mon 17 Aug");
  });
});
