import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>; userId: string };

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Accès réservé à l'administrateur.");
}

function baseUrl(): string {
  try {
    const url = getRequestUrl();
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://go.ivoireprojet.com";
  }
}

/* ------------------------------------------------------------------ */
/* Entitlement exports                                                 */
/* ------------------------------------------------------------------ */

export const getExportEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("export_unlocked_until")
      .eq("id", context.userId)
      .maybeSingle();
    const until = (data as { export_unlocked_until: string | null } | null)?.export_unlocked_until ?? null;
    return { unlocked: !!until && new Date(until).getTime() > Date.now(), unlocked_until: until };
  });

/* ------------------------------------------------------------------ */
/* Paiement Wave (utilisateur)                                         */
/* ------------------------------------------------------------------ */

export const startWaveCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ plan: z.enum(["mensuel", "trimestre", "annuel"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { GO_PLANS, loadWaveConfig, createWaveCheckoutSession } = await import("@/lib/wave.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const config = await loadWaveConfig();
    if (!config.apiKey) {
      throw new Error("Paiement Wave non configuré. L'administrateur doit enregistrer la clé API Wave.");
    }

    const plan = GO_PLANS[data.plan];
    const reference = `MPG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const site = baseUrl();

    const session = await createWaveCheckoutSession({
      apiKey: config.apiKey,
      amount: plan.amount,
      clientReference: reference,
      successUrl: `${site}/paiements?ref=${reference}&statut=succes`,
      errorUrl: `${site}/paiements?ref=${reference}&statut=echec`,
    });

    const { error } = await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      amount: plan.amount,
      currency: "XOF",
      payment_method: "wave",
      payment_reference: reference,
      status: "pending",
      metadata: {
        app: "miprojet-go",
        module: "exports",
        plan_id: data.plan,
        plan_label: plan.label,
        plan_days: plan.days,
        wave_session_id: session.id,
        wave_checkout_status: session.checkout_status,
        wave_mode: config.mode,
      },
    } as never);
    if (error) throw new Error(error.message);

    return { reference, url: session.wave_launch_url, amount: plan.amount, plan: plan.label };
  });

/** Vérifie l'état réel d'un paiement auprès de Wave (fallback si le webhook tarde). */
export const syncWavePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reference: z.string().min(4).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { loadWaveConfig, getWaveCheckoutSession, grantExportDays } = await import("@/lib/wave.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, status, metadata")
      .eq("payment_reference", data.reference)
      .maybeSingle();
    if (!payment) throw new Error("Paiement introuvable.");

    let isOwner = payment.user_id === context.userId;
    if (!isOwner) await assertAdmin(context);

    const meta = (payment.metadata ?? {}) as Record<string, unknown>;
    const sessionId = String(meta["wave_session_id"] ?? "");
    const config = await loadWaveConfig();
    if (!config.apiKey || !sessionId) return { status: payment.status, unlocked_until: null };

    const session = await getWaveCheckoutSession(config.apiKey, sessionId);
    const succeeded = session.payment_status === "succeeded" || session.checkout_status === "complete";
    const status = succeeded ? "completed" : session.checkout_status === "expired" ? "failed" : "pending";

    let unlockedUntil: string | null = null;
    if (succeeded && payment.status !== "completed") {
      unlockedUntil = await grantExportDays(payment.user_id!, Number(meta["plan_days"] ?? 31));
    }

    await supabaseAdmin
      .from("payments")
      .update({
        status,
        updated_at: new Date().toISOString(),
        metadata: {
          ...meta,
          wave_checkout_status: session.checkout_status,
          wave_payment_status: session.payment_status,
          synced_at: new Date().toISOString(),
          ...(unlockedUntil ? { export_unlocked_until: unlockedUntil } : {}),
        },
      } as never)
      .eq("id", payment.id);

    return { status, unlocked_until: unlockedUntil };
  });

export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payments")
      .select("id, amount, currency, status, payment_method, payment_reference, metadata, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ------------------------------------------------------------------ */
/* Panneau admin                                                       */
/* ------------------------------------------------------------------ */

function mask(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export const getPaymentsAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { loadWaveConfig } = await import("@/lib/wave.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const config = await loadWaveConfig();

    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, amount, currency, status, payment_method, payment_reference, metadata, created_at")
      .eq("payment_method", "wave")
      .order("created_at", { ascending: false })
      .limit(100);

    const rows = payments ?? [];
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
    const { data: profiles } = userIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name, phone, export_unlocked_until")
          .in("id", userIds)
      : { data: [] as Array<{ id: string; full_name: string | null; phone: string | null; export_unlocked_until: string | null }> };

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    const webhookEvents = rows
      .map((r) => (r.metadata ?? {}) as Record<string, unknown>)
      .filter((m) => m["webhook_received_at"]);
    const lastWebhookAt = webhookEvents
      .map((m) => String(m["webhook_received_at"]))
      .sort()
      .reverse()[0] ?? null;

    return {
      wave: {
        apiKeyConfigured: !!config.apiKey,
        apiKeyMasked: mask(config.apiKey),
        apiKeySource: config.apiKeySource,
        webhookSecretConfigured: !!config.webhookSecret,
        webhookSecretSource: config.webhookSecretSource,
        mode: config.mode,
        webhookUrl: `${baseUrl()}/api/public/wave-webhook`,
        lastWebhookAt,
        webhookVerified: !!lastWebhookAt,
      },
      totals: {
        count: rows.length,
        completed: rows.filter((r) => r.status === "completed").length,
        pending: rows.filter((r) => r.status === "pending").length,
        revenue: rows
          .filter((r) => r.status === "completed")
          .reduce((sum, r) => sum + Number(r.amount ?? 0), 0),
      },
      payments: rows.map((r) => {
        const profile = r.user_id ? byId.get(r.user_id) : undefined;
        const meta = (r.metadata ?? {}) as Record<string, unknown>;
        return {
          id: r.id,
          reference: r.payment_reference,
          amount: Number(r.amount ?? 0),
          status: r.status,
          createdAt: r.created_at,
          plan: String(meta["plan_label"] ?? meta["description"] ?? "—"),
          userId: r.user_id,
          userName: profile?.full_name ?? profile?.phone ?? "—",
          userPhone: profile?.phone ?? null,
          exportUntil: profile?.export_unlocked_until ?? null,
        };
      }),
    };
  });

export const saveWaveKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        apiKey: z.string().trim().max(300).optional(),
        webhookSecret: z.string().trim().max(300).optional(),
        mode: z.enum(["live", "sandbox"]).default("live"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { WAVE_SETTING_KEYS } = await import("@/lib/wave.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const updates: Array<{ key: string; value: string; category: string }> = [
      { key: WAVE_SETTING_KEYS.mode, value: data.mode, category: "payment" },
    ];
    if (data.apiKey) updates.push({ key: WAVE_SETTING_KEYS.apiKey, value: data.apiKey, category: "payment" });
    if (data.webhookSecret)
      updates.push({ key: WAVE_SETTING_KEYS.webhookSecret, value: data.webhookSecret, category: "payment" });

    for (const row of updates) {
      const { data: existing } = await supabaseAdmin
        .from("platform_settings")
        .select("id")
        .eq("key", row.key)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("platform_settings")
          .update({ value: row.value, updated_at: new Date().toISOString() } as never)
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("platform_settings").insert(row as never);
      }
    }
    return { ok: true };
  });

export const testWaveConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { loadWaveConfig } = await import("@/lib/wave.server");
    const config = await loadWaveConfig();
    if (!config.apiKey) return { ok: false, message: "Aucune clé API Wave enregistrée." };
    const res = await fetch("https://api.wave.com/v1/balance", {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    const body = await res.text();
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Clé Wave refusée [${res.status}] : ${body.slice(0, 200)}` };
    }
    return { ok: true, message: `Wave joignable (HTTP ${res.status}).` };
  });

/** Attribue ou révoque manuellement l'accès aux exports (admin). */
export const setExportAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), days: z.number().int().min(0).max(3650) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { grantExportDays } = await import("@/lib/wave.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.days === 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ export_unlocked_until: null } as never)
        .eq("id", data.userId);
      if (error) throw new Error(error.message);
      return { unlocked_until: null };
    }
    return { unlocked_until: await grantExportDays(data.userId, data.days) };
  });

/** Confirme ou annule un paiement à la main (admin) — CRUD réel. */
export const setPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        paymentId: z.string().uuid(),
        status: z.enum(["completed", "failed", "pending", "refunded"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { grantExportDays } = await import("@/lib/wave.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, status, metadata")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!payment) throw new Error("Paiement introuvable.");

    const meta = (payment.metadata ?? {}) as Record<string, unknown>;
    let unlockedUntil: string | null = null;
    if (data.status === "completed" && payment.status !== "completed" && payment.user_id) {
      unlockedUntil = await grantExportDays(payment.user_id, Number(meta["plan_days"] ?? 31));
    }

    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        status: data.status,
        updated_at: new Date().toISOString(),
        metadata: {
          ...meta,
          manual_review_by: context.userId,
          manual_review_at: new Date().toISOString(),
          ...(unlockedUntil ? { export_unlocked_until: unlockedUntil } : {}),
        },
      } as never)
      .eq("id", payment.id);
    if (error) throw new Error(error.message);
    return { ok: true, unlocked_until: unlockedUntil };
  });