import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { createClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/supabase/user";
import { UnitProvider } from "@/lib/unit-context";
import { isUnit, type Unit } from "@/lib/units";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The id comes from the header middleware set after validating the session
  // on this request — no second round trip to re-verify what was just verified.
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();

  // No profile row until the setting is first changed, so a missing row is the
  // default rather than an error.
  const { data: profile } = await supabase
    .from("profiles")
    .select("unit")
    .eq("id", userId)
    .maybeSingle();

  const unit: Unit = isUnit(profile?.unit) ? profile.unit : "kg";

  return (
    <UnitProvider unit={unit}>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        {/* Clears the fixed nav plus the home indicator. */}
        <div className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomNav />
      </div>
    </UnitProvider>
  );
}
