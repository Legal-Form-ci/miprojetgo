import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-only mapping — never shipped to the browser bundle.
// Codes are compared case-insensitively.
const PLAN_DAYS: Record<string, number> = {
  "MPG-DEMO": 7,
  "MPG-MENSUEL": 31,
  "MPG-TRIMESTRE": 93,
  "MPG-ANNUEL": 366,
};

export const redeemExportCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => ({
    code: String(data?.code ?? "").trim().toUpperCase(),
  }))
  .handler(async ({ data, context }) => {
    const days = PLAN_DAYS[data.code];
    if (!days) return { ok: false as const };
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await context.supabase
      .from("profiles")
      .update({ export_unlocked_until: until } as never)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const, unlocked_until: until };
  });

export const getExportEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("export_unlocked_until")
      .eq("id", context.userId)
      .maybeSingle();
    const until = (data as { export_unlocked_until: string | null } | null)?.export_unlocked_until ?? null;
    const unlocked = !!until && new Date(until).getTime() > Date.now();
    return { unlocked, unlocked_until: until };
  });