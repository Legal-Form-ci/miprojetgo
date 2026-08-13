// Server-only Wave (paiement mobile money) integration.
// Clés lues d'abord depuis la table platform_settings (catégorie "payment"),
// puis depuis les variables d'environnement du projet.

export type GoPlanId = "mensuel" | "trimestre" | "annuel";

export const GO_PLANS: Record<GoPlanId, { label: string; amount: number; days: number }> = {
  mensuel: { label: "MiProjet Go — Mensuel", amount: 2000, days: 31 },
  trimestre: { label: "MiProjet Go — Trimestre", amount: 5000, days: 93 },
  annuel: { label: "MiProjet Go — Annuel", amount: 18000, days: 366 },
};

export const WAVE_SETTING_KEYS = {
  apiKey: "wave_api_key",
  webhookSecret: "wave_webhook_secret",
  mode: "wave_mode",
} as const;

const WAVE_API = "https://api.wave.com/v1";

export type WaveConfig = {
  apiKey: string | null;
  webhookSecret: string | null;
  mode: string;
  apiKeySource: "database" | "env" | "none";
  webhookSecretSource: "database" | "env" | "none";
};

export async function loadWaveConfig(): Promise<WaveConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("platform_settings")
    .select("key, value")
    .in("key", [WAVE_SETTING_KEYS.apiKey, WAVE_SETTING_KEYS.webhookSecret, WAVE_SETTING_KEYS.mode]);

  const rows = new Map((data ?? []).map((r) => [r.key, (r.value ?? "").toString().trim()]));
  const dbApiKey = rows.get(WAVE_SETTING_KEYS.apiKey) || "";
  const dbSecret = rows.get(WAVE_SETTING_KEYS.webhookSecret) || "";
  const envApiKey = (process.env["WAVE_API_KEY"] ?? "").trim();
  const envSecret = (process.env["WAVE_WEBHOOK_SECRET"] ?? "").trim();

  return {
    apiKey: dbApiKey || envApiKey || null,
    webhookSecret: dbSecret || envSecret || null,
    mode: rows.get(WAVE_SETTING_KEYS.mode) || "live",
    apiKeySource: dbApiKey ? "database" : envApiKey ? "env" : "none",
    webhookSecretSource: dbSecret ? "database" : envSecret ? "env" : "none",
  };
}

export type WaveSession = {
  id: string;
  amount: string;
  currency: string;
  checkout_status: string;
  payment_status: string;
  client_reference?: string | null;
  wave_launch_url: string;
};

export async function createWaveCheckoutSession(input: {
  apiKey: string;
  amount: number;
  clientReference: string;
  successUrl: string;
  errorUrl: string;
}): Promise<WaveSession> {
  const res = await fetch(`${WAVE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.clientReference,
    },
    body: JSON.stringify({
      amount: String(input.amount),
      currency: "XOF",
      client_reference: input.clientReference,
      success_url: input.successUrl,
      error_url: input.errorUrl,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`[Wave] checkout failed [${res.status}]: ${body}`);
    throw new Error(`Wave a refusé la demande de paiement [${res.status}] : ${body}`);
  }
  return JSON.parse(body) as WaveSession;
}

export async function getWaveCheckoutSession(apiKey: string, sessionId: string): Promise<WaveSession> {
  const res = await fetch(`${WAVE_API}/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`[Wave] session read failed [${res.status}]: ${body}`);
    throw new Error(`Wave: statut indisponible [${res.status}] : ${body}`);
  }
  return JSON.parse(body) as WaveSession;
}

/** Wave-Signature: "t=<timestamp>,v1=<hmac_sha256(timestamp+body)>" */
export async function verifyWaveSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim());
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2) ?? "";
  const signatures = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}${rawBody}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((sig) => timingSafeEqual(sig, expected));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Applique le déblocage des exports après un paiement confirmé. */
export async function grantExportDays(userId: string, days: number): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("export_unlocked_until")
    .eq("id", userId)
    .maybeSingle();
  const current = profile?.export_unlocked_until ? new Date(profile.export_unlocked_until).getTime() : 0;
  const base = Math.max(current, Date.now());
  const until = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ export_unlocked_until: until })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return until;
}