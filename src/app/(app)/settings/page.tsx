import Link from "next/link";
import { redirect } from "next/navigation";
import { UnitSetting } from "@/components/unit-setting";
import { createClient } from "@/lib/supabase/server";
import { isUnit, type Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("unit")
    .eq("id", user.id)
    .maybeSingle();

  const unit: Unit = isUnit(profile?.unit) ? profile.unit : "kg";

  return (
    <main className="px-4 pt-6">
      <h1 className="font-brand mb-5 text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="space-y-3">
        <UnitSetting userId={user.id} initial={unit} />

        <section className="rounded-2xl bg-surface-1 p-4">
          <h2 className="text-[15px] font-medium">Saved workouts</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Rename, reorder or delete the workouts you can load into a session.
          </p>
          <Link
            href="/saved"
            className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-line text-[15px] font-medium text-fg-muted"
          >
            Manage saved workouts
          </Link>
        </section>

        <section className="rounded-2xl bg-surface-1 p-4">
          <h2 className="text-[15px] font-medium">Account</h2>
          <p className="mt-1 text-sm text-fg-muted">{user.email}</p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-3 min-h-12 w-full rounded-xl border border-line text-[15px] font-medium text-fg-muted"
            >
              Sign out
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
