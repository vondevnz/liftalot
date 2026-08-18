import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { createClient } from "@/lib/supabase/server";
import { UnitProvider } from "@/lib/unit-context";
import { isUnit, type Unit } from "@/lib/units";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The middleware already redirects unauthenticated requests; this is the
  // belt to its braces, and it gives the pages below a guaranteed user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // No profile row until the setting is first changed, so a missing row is the
  // default rather than an error.
  const { data: profile } = await supabase
    .from("profiles")
    .select("unit")
    .eq("id", user.id)
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
