"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayLocal } from "@/lib/date";

function TodayIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <rect
        x="3" y="4.5" width="18" height="16" rx="3"
        stroke="currentColor" strokeWidth="1.6"
      />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {active && <rect x="7" y="12.5" width="4" height="4" rx="1" fill="currentColor" />}
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 6.5h16M4 12h16M4 17.5h10"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      />
      {active && <circle cx="19" cy="17.5" r="2" fill="currentColor" />}
    </svg>
  );
}

function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 18l5-6 4 3 6-8"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      {active && <circle cx="19" cy="7" r="2" fill="currentColor" />}
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2L5.6 5.6"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      />
      {active && <circle cx="12" cy="12" r="1.6" fill="currentColor" />}
    </svg>
  );
}

function NavLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      /* Four links share the width either side of the FAB, so the label drops
         to 10px to stop "Progress" and "Settings" wrapping at 390px. */
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
        active ? "text-accent" : "text-fg-dim"
      }`}
    >
      {children}
      {label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  // This component lives in the group layout, so it survives navigation rather
  // than unmounting. Without an explicit reset the spinner runs forever after a
  // successful start, and the `if (starting) return` guard below leaves + dead
  // until a hard reload.
  useEffect(() => {
    setStarting(false);
  }, [pathname]);

  async function startWorkout() {
    if (starting) return;
    setStarting(true);

    const supabase = createClient();
    // The date is computed here, in the browser, so an evening session is
    // filed under the user's own calendar day rather than UTC's.
    const date = todayLocal();

    // One round trip. start_workout finds today's empty session or creates
    // one, and resolves the user from auth.uid() server-side — so there is no
    // getUser call, no separate select, and no separate insert.
    const { data, error } = await supabase.rpc("start_workout", { p_date: date });

    if (error || !data) {
      setStarting(false);
      return;
    }
    router.push(`/workout/${data as string}`);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-center px-2">
        <NavLink href="/" label="Home" active={pathname === "/"}>
          <TodayIcon active={pathname === "/"} />
        </NavLink>

        <NavLink
          href="/progress"
          label="Progress"
          active={pathname.startsWith("/progress") || pathname.startsWith("/exercise")}
        >
          <ProgressIcon
            active={pathname.startsWith("/progress") || pathname.startsWith("/exercise")}
          />
        </NavLink>

        <button
          type="button"
          onClick={startWorkout}
          disabled={starting}
          aria-label="Start a workout"
          className="-mt-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-black shadow-lg shadow-accent/20 transition-transform active:scale-95 disabled:opacity-60"
        >
          {/* The tap has to acknowledge itself before the round trip returns. */}
          {starting ? (
            <span
              className="h-6 w-6 animate-spin rounded-full border-[3px] border-black/25 border-t-black"
              aria-hidden="true"
            />
          ) : (
            <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        <NavLink
          href="/history"
          label="History"
          active={pathname.startsWith("/history") || pathname.startsWith("/saved")}
        >
          <HistoryIcon active={pathname.startsWith("/history") || pathname.startsWith("/saved")} />
        </NavLink>

        <NavLink
          href="/settings"
          label="Settings"
          active={pathname.startsWith("/settings")}
        >
          <SettingsIcon active={pathname.startsWith("/settings")} />
        </NavLink>
      </div>
    </nav>
  );
}
