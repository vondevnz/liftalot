import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mark } from "@/components/logo";

export const metadata: Metadata = {
  title: "Liftalot — move every day, lift when you can",
  description:
    "A lift tracker built around daily movement. A workout fills the cell brightly, an hour's walk fills it dimly — so a rest day is still a streak day.",
  openGraph: {
    title: "Liftalot — move every day, lift when you can",
    description:
      "A lift tracker built around daily movement, not training optimisation.",
    images: ["/brand/icon-512.png"],
  },
};

/** The four heatmap states, in the app's own ramp — the idea in one row. */
const STATES = [
  { label: "Rest", className: "bg-surface-2 ring-[0.5px] ring-line" },
  { label: "Walk", className: "bg-heat-1" },
  { label: "Workout", className: "bg-heat-2" },
  { label: "Both", className: "bg-heat-3" },
];

const SHOTS = [
  {
    src: "/screens/home.png",
    alt: "Liftalot home screen: walk toggle, current and longest streak, a three-month activity grid, and a combined total chart.",
    width: 483,
    height: 910,
    title: "Your year, one grid",
    body: "Every day you move gets a cell. Walk or lift — both count, so the streak stops fighting a sensible rest day. Current and longest sit right above it.",
  },
  {
    src: "/screens/logging.png",
    alt: "Logging a Push session: bench press, incline dumbbell press and overhead press with sets, weights and reps.",
    width: 464,
    height: 903,
    title: "Log a set in two taps",
    body: "Weight, reps, Add. The fields keep what you last entered, because the next set is usually the same. Save a session by name and load it again next week.",
  },
  {
    src: "/screens/progress.png",
    alt: "Bench Press progress: heaviest lift, session count, and a chart of top weight per session over calendar time.",
    width: 484,
    height: 914,
    title: "Watch a lift climb",
    body: "Top weight per session, plotted over calendar time — so a three-week layoff looks like a gap, not a straight line. Every number is in the table underneath.",
  },
];

const OMITTED = ["Step counts", "1RM estimates", "Warm-up sets", "Programme builders", "Streak guilt"];

export default function WelcomePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="inline-flex items-center gap-2">
          <Mark size={26} />
          <span className="font-brand text-lg font-bold tracking-[-0.04em]">Liftalot</span>
        </span>
        <Link
          href="/login"
          className="min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Sign in
        </Link>
      </header>

      {/* Hero. The glow is a single radial behind the copy — cheap, and it stops
          a near-black page reading as a void on a big screen. */}
      <section className="relative overflow-hidden px-5 pb-4 pt-10 sm:pt-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent)",
          }}
        />
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-accent">Move every day. Lift when you can.</p>
          <h1 className="font-brand mt-3 text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
            A lift tracker that
            <br className="hidden sm:block" /> rewards showing up.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-fg-muted">
            Most trackers only count the days you trained hard. Liftalot counts
            the days you moved — so an hour on your feet keeps the chain alive.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex h-13 w-full max-w-xs items-center justify-center rounded-xl bg-accent px-8 text-base font-semibold text-black transition-colors hover:bg-accent-hover sm:w-auto"
            >
              Sign in
            </Link>
            <a
              href="#how"
              className="flex h-13 items-center justify-center px-4 text-base text-fg-muted transition-colors hover:text-fg"
            >
              See how it works
            </a>
          </div>

          {/* The four states are the whole premise, so they lead. */}
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-fg-muted">
            {STATES.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-[18px] rounded-full ${s.className}`}
                  aria-hidden="true"
                />
                {s.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-12 max-w-xs sm:max-w-sm">
          <PhoneFrame>
            <Image
              src={SHOTS[0].src}
              alt={SHOTS[0].alt}
              width={SHOTS[0].width}
              height={SHOTS[0].height}
              priority
              sizes="(max-width: 640px) 20rem, 24rem"
              className="h-auto w-full"
            />
          </PhoneFrame>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl scroll-mt-8 px-5 py-16 sm:py-24">
        <div className="space-y-20 sm:space-y-28">
          {SHOTS.map((shot, i) => (
            <div
              key={shot.src}
              className={`flex flex-col items-center gap-10 sm:gap-14 ${
                i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
              }`}
            >
              <div className="w-full max-w-[16rem] shrink-0 sm:max-w-xs">
                <PhoneFrame>
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={shot.width}
                    height={shot.height}
                    sizes="(max-width: 640px) 16rem, 20rem"
                    className="h-auto w-full"
                  />
                </PhoneFrame>
              </div>
              <div className="max-w-md text-center md:text-left">
                <h2 className="font-brand text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
                  {shot.title}
                </h2>
                <p className="mt-3 text-lg text-fg-muted">{shot.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What it deliberately isn't — the clearest way to say what it is. */}
      <section className="mx-auto max-w-3xl px-5 pb-16 sm:pb-24">
        <div className="rounded-3xl border border-line bg-surface-1 p-8 text-center sm:p-12">
          <h2 className="font-brand text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
            What it leaves out
          </h2>
          <p className="mx-auto mt-3 max-w-md text-fg-muted">
            Everything here is a thing another tracker would have sold you. None
            of it made you fitter.
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {OMITTED.map((x) => (
              <li
                key={x}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm text-fg-dim line-through decoration-heat-2/70"
              >
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20 text-center sm:pb-28">
        <h2 className="font-brand text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
          Fill in today&apos;s cell.
        </h2>
        <Link
          href="/login"
          className="mt-7 inline-flex h-13 items-center justify-center rounded-xl bg-accent px-10 text-base font-semibold text-black transition-colors hover:bg-accent-hover"
        >
          Sign in
        </Link>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-fg-dim sm:flex-row">
          <span className="inline-flex items-center gap-2">
            <Mark size={18} />
            Liftalot
          </span>
          <span>Move every day. Lift when you can.</span>
        </div>
      </footer>
    </div>
  );
}

/** Rounded bezel + glow, so a flat PNG reads as a device rather than a crop. */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[3rem] opacity-20 blur-2xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-heat-2), transparent)",
        }}
      />
      <div className="overflow-hidden rounded-[2rem] border border-line bg-surface-1 p-1.5 shadow-2xl shadow-black/60">
        <div className="overflow-hidden rounded-[1.6rem]">{children}</div>
      </div>
    </div>
  );
}
