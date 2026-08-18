"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef } from "react";
import { formatShortDate, type DateString } from "@/lib/date";
import { buildWeeks, monthSegments } from "@/lib/heatmap";
import { levelOf } from "@/lib/streak";
import { LEVEL_LABELS, type ActivityDay, type ActivityLevel } from "@/lib/types";

// Horizontal capsules, after ideas/headmaps.png: wider than tall with fully
// rounded ends (radius = half the height, so the caps are true semicircles).
//
// The reference draws far chunkier capsules than these, but it only fits ten
// columns across. Holding the three-month window means 14 columns at a 22px
// pitch — 308px, against the ~304px a 390px phone leaves after page and card
// padding and the weekday gutter — so the height is what gives way.
const CELL_W = 18;
const CELL_H = 10;
const RADIUS = CELL_H / 2;
const GAP = 4;
const PITCH = CELL_W + GAP;

const LEVEL_CLASS: Record<ActivityLevel, string> = {
  0: "bg-surface-2 ring-[0.5px] ring-line",
  1: "bg-heat-1",
  2: "bg-heat-2",
  3: "bg-heat-3",
};

type Props = {
  days: ActivityDay[];
  today: DateString;
};

export function ActivityHeatmap({ days, today }: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  const byDate = useMemo(() => {
    const m = new Map<DateString, ActivityDay>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  // Columns are weeks, Sunday at the top, matching the row labels.
  const weeks = useMemo(() => buildWeeks(today), [today]);

  // One label per run of columns belonging to the same month, sized to that
  // run rather than the fixed width a static mockup can get away with.
  const segments = useMemo(() => monthSegments(weeks), [weeks]);

  // Three months fits most phones outright, but a narrow device or large text
  // setting can still overflow — keep landing on today rather than three months
  // ago. Layout effect so it happens before paint and never reads as a jump.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks.length]);

  return (
    <section className="rounded-2xl bg-surface-1 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-medium">Activity</h2>
        <span className="text-xs text-fg-dim">Last 3 months</span>
      </div>

      <div ref={scroller} className="no-scrollbar overflow-x-auto">
        <div className="w-max">
          <div
            className="mb-1 flex text-[11px] text-fg-dim"
            style={{ paddingLeft: 22 }}
            aria-hidden="true"
          >
            {segments.map((seg, i) => (
              <span
                key={`${seg.label}-${i}`}
                className="shrink-0 overflow-hidden whitespace-nowrap"
                style={{ width: seg.weeks * PITCH }}
              >
                {/* A one-week sliver has no room for "Sep" without colliding. */}
                {seg.weeks > 1 ? seg.label : ""}
              </span>
            ))}
          </div>

          <div className="flex gap-1">
            <div
              /* 10px type, because an 11px glyph does not sit inside a 10px row. */
              className="flex w-[18px] shrink-0 flex-col text-[10px] leading-none text-fg-dim"
              style={{ gap: GAP }}
              aria-hidden="true"
            >
              {["", "M", "", "W", "", "F", ""].map((d, i) => (
                <span key={i} style={{ height: CELL_H, lineHeight: `${CELL_H}px` }}>
                  {d}
                </span>
              ))}
            </div>

            <div
              className="grid grid-flow-col"
              style={{
                gap: GAP,
                gridTemplateRows: `repeat(7, ${CELL_H}px)`,
              }}
            >
              {weeks.flat().map((date, i) =>
                date === null ? (
                  <span key={`pad-${i}`} style={{ width: CELL_W, height: CELL_H }} />
                ) : (
                  <Cell
                    key={date}
                    date={date}
                    day={byDate.get(date)}
                    isToday={date === today}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-xs text-fg-muted">
        {([0, 1, 2, 3] as ActivityLevel[]).map((level) => (
          <li key={level} className="flex items-center gap-1.5">
            <span
              className={`inline-block ${LEVEL_CLASS[level]}`}
              style={{ width: CELL_W, height: CELL_H, borderRadius: RADIUS }}
            />
            {level === 3 ? "Both" : LEVEL_LABELS[level]}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Cell({
  date,
  day,
  isToday,
}: {
  date: DateString;
  day: ActivityDay | undefined;
  isToday: boolean;
}) {
  const level = levelOf(day);
  const label = `${formatShortDate(date)} — ${LEVEL_LABELS[level].toLowerCase()}`;
  return (
    <Link
      href={`/day/${date}`}
      aria-label={isToday ? `${label} (today)` : label}
      title={`${formatShortDate(date)} — ${LEVEL_LABELS[level]}`}
      /* Outline rather than ring: level 0 already spends its ring on the
         empty-cell border, and outline follows the capsule radius. */
      className={`block ${LEVEL_CLASS[level]} ${
        isToday ? "outline-2 outline-offset-1 outline-accent" : ""
      }`}
      style={{ width: CELL_W, height: CELL_H, borderRadius: RADIUS }}
    />
  );
}
