import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/wave-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const { loadWaveConfig, verifyWaveSignature, grantExportDays } = await import("@/lib/wave.server");
        const config = await loadWaveConfig();

        if (!config.webhookSecret) {
          console.error("[Wave webhook] secret manquant");
          return new Response("Webhook secret not configured", { status: 503 });
        }

        const signature =
          request.headers.get("wave-signature") ?? request.headers.get("Wave-Signature");
        const valid = await verifyWaveSignature(raw, signature, config.webhookSecret);
        if (!valid) {
          console.error("[Wave webhook] signature invalide");
          return new Response("Invalid signature", { status: 401 });
        }

        let event: { type?: string; data?: Record<string, unknown> };
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const payload = event.data ?? {};
        const reference = String(payload["client_reference"] ?? "");
        const sessionId = String(payload["id"] ?? "");
        if (!reference && !sessionId) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const query = supabaseAdmin
          .from("payments")
          .select("id, user_id, status, metadata")
          .limit(1);
        const { data: payment } = reference
          ? await query.eq("payment_reference", reference).maybeSingle()
          : await query.contains("metadata", { wave_session_id: sessionId } as never).maybeSingle();

        if (!payment) {
          console.error(`[Wave webhook] paiement inconnu ref=${reference} session=${sessionId}`);
          return new Response("ok");
        }

        const type = event.type ?? "";
        const succeeded =
          type === "checkout.session.completed" ||
          payload["payment_status"] === "succeeded" ||
          payload["checkout_status"] === "complete";
        const failed =
          type === "checkout.session.payment_failed" ||
          payload["checkout_status"] === "expired" ||
          payload["payment_status"] === "failed";
        const status = succeeded ? "completed" : failed ? "failed" : "pending";

        const meta = (payment.metadata ?? {}) as Record<string, unknown>;
        let unlockedUntil: string | null = null;
        if (succeeded && payment.status !== "completed" && payment.user_id) {
          unlockedUntil = await grantExportDays(payment.user_id, Number(meta["plan_days"] ?? 31));
        }

        const events = Array.isArray(meta["webhook_events"]) ? (meta["webhook_events"] as unknown[]) : [];
        const { error } = await supabaseAdmin
          .from("payments")
          .update({
            status,
            updated_at: new Date().toISOString(),
            metadata: {
              ...meta,
              wave_session_id: sessionId || meta["wave_session_id"],
              wave_checkout_status: payload["checkout_status"] ?? meta["wave_checkout_status"],
              wave_payment_status: payload["payment_status"] ?? null,
              webhook_received_at: new Date().toISOString(),
              webhook_events: [...events.slice(-9), { type, at: new Date().toISOString(), status }],
              ...(unlockedUntil ? { export_unlocked_until: unlockedUntil } : {}),
            },
          } as never)
          .eq("id", payment.id);
        if (error) console.error(`[Wave webhook] update failed: ${error.message}`);

        return Response.json({ received: true, status });
      },
    },
  },
});