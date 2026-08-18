"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDayLabel, formatShortDate, monthLabel, type DateString } from "@/lib/date";
import {
  dateFraction,
  monthTicks,
  niceTicks,
  showMonthTicks,
  type ChartPoint,
  type Metric,
} from "@/lib/exercise-history";

/**
 * Top weight over calendar time.
 *
 * Series colour is --color-heat-2 (#EA580C), the existing "workout" heat step —
 * it passes the dark-mode lightness band and 3:1 contrast against the card,
 * which the brighter --color-accent does not. One series, so there is no
 * legend: the heading names it.
 */
const SERIES = "var(--color-heat-2)";

const PAD = { top: 12, right: 14, bottom: 24, left: 38 };
const HEIGHT = 190;
const DOT_R = 4; // 8px marker
const HIT_R = 12; // ≥24px hit target
/**
 * Minimum space between two x-axis labels. A three-letter month at 10px is
 * ~20px, and twelve months across a 320px phone lands them 22px apart — close
 * enough to touch. Labels are thinned by measured position rather than a fixed
 * stride, so it adapts to width and to unequal month lengths.
 */
const MIN_LABEL_GAP = 34;

export function ProgressChart({
  points,
  metric,
  unitLabel,
}: {
  points: ChartPoint[];
  metric: Metric;
  unitLabel: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [active, setActive] = useState<number | null>(null);

  // Measured rather than scaled by viewBox, so a 2px stroke is 2px at any
  // container size instead of being multiplied by the scale factor.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(240, entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    if (points.length === 0) return null;

    const first = points[0].date;
    const last = points[points.length - 1].date;
    const values = points.map((p) => p.value);
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];

    const plotW = width - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;

    const x = (d: DateString) => PAD.left + dateFraction(d, first, last) * plotW;
    const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

    const months: DateString[] = [];
    let lastLabelX = -Infinity;
    for (const m of monthTicks(first, last)) {
      if (x(m) - lastLabelX >= MIN_LABEL_GAP) {
        months.push(m);
        lastLabelX = x(m);
      }
    }

    return {
      first,
      last,
      ticks,
      plotW,
      plotH,
      x,
      y,
      xs: points.map((p) => x(p.date)),
      ys: points.map((p) => y(p.value)),
      showMonths: showMonthTicks(first, last),
      months,
    };
  }, [points, width]);

  if (!geometry) return null;

  const { ticks, x, y, xs, ys, first, last, showMonths, months } = geometry;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xs[i]} ${ys[i]}`).join(" ");
  const lastIndex = points.length - 1;
  const shown = active ?? lastIndex;

  /** The crosshair finds the X — the reader aims at a date, not at a 2px line. */
  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let nearest = 0;
    for (let i = 1; i < xs.length; i++) {
      if (Math.abs(xs[i] - px) < Math.abs(xs[nearest] - px)) nearest = i;
    }
    setActive(nearest);
  }

  return (
    <div ref={wrap}>
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`Top ${metric === "weight" ? "weight" : "reps"} per session, ${formatShortDate(first)} to ${formatShortDate(last)}. Full values in the table below.`}
        className="touch-pan-y select-none"
        onPointerMove={onPointer}
        onPointerLeave={() => setActive(null)}
      >
        {/* Gridlines: hairline, solid, one step off the surface. */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 7}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-[var(--color-fg-dim)] text-[10px] tabular-nums"
            >
              {t}
            </text>
          </g>
        ))}

        {/* X labels: month boundaries over a long range, endpoints over a short one. */}
        {showMonths
          ? months.map((m) => (
              <text
                key={m}
                x={x(m)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-[var(--color-fg-dim)] text-[10px]"
              >
                {monthLabel(m)}
              </text>
            ))
          : [
              { d: first, anchor: "start" as const },
              { d: last, anchor: "end" as const },
            ].map(({ d, anchor }, i) =>
              i === 1 && d === first ? null : (
                <text
                  key={d}
                  x={i === 0 ? PAD.left : width - PAD.right}
                  y={HEIGHT - 8}
                  textAnchor={anchor}
                  className="fill-[var(--color-fg-dim)] text-[10px]"
                >
                  {formatShortDate(d)}
                </text>
              ),
            )}

        {points.length > 1 && (
          <path
            d={path}
            fill="none"
            stroke={SERIES}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Crosshair */}
        {active !== null && (
          <line
            x1={xs[active]}
            x2={xs[active]}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            stroke="var(--color-fg-dim)"
            strokeWidth={1}
          />
        )}

        {points.map((p, i) => (
          <g key={p.date}>
            {/* 2px surface ring keeps dots legible where they cross the line. */}
            <circle
              cx={xs[i]}
              cy={ys[i]}
              r={DOT_R}
              fill={SERIES}
              stroke="var(--color-surface-1)"
              strokeWidth={2}
            />
            <circle cx={xs[i]} cy={ys[i]} r={HIT_R} fill="transparent" />
          </g>
        ))}

        {/* Value at the end of the line — never a number on every point. */}
        <text
          x={Math.min(xs[shown] + 9, width - PAD.right)}
          y={Math.max(ys[shown] - 9, PAD.top + 8)}
          textAnchor={xs[shown] > width - 70 ? "end" : "start"}
          className="fill-[var(--color-fg)] text-[12px] font-medium tabular-nums"
        >
          {points[shown].value}
          {unitLabel}
        </text>
      </svg>

      <p className="mt-1 min-h-5 text-center text-xs text-fg-muted">
        {formatDayLabel(points[shown].date)}
      </p>
    </div>
  );
}
