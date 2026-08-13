import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, KeyRound, Webhook, RefreshCw, ShieldCheck, Copy } from "lucide-react";

import {
  getPaymentsAdminOverview,
  saveWaveKeys,
  testWaveConnection,
  setPaymentStatus,
  setExportAccess,
} from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/paiements")({
  head: () => ({
    meta: [
      { title: "Paiements Wave & accès — MiPROJET Go" },
      {
        name: "description",
        content:
          "Panneau administrateur MiPROJET Go : clés Wave, état des webhooks, suivi des paiements et gestion des accès aux exports.",
      },
      { property: "og:title", content: "Paiements Wave & accès — MiPROJET Go" },
      {
        property: "og:description",
        content: "Configuration Wave, webhooks et déblocage des exports pour les activités MiPROJET Go.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaiementsAdmin,
});

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

function PaiementsAdmin() {
  const qc = useQueryClient();
  const overview = useServerFn(getPaymentsAdminOverview);
  const saveKeys = useServerFn(saveWaveKeys);
  const testWave = useServerFn(testWaveConnection);
  const updateStatus = useServerFn(setPaymentStatus);
  const updateAccess = useServerFn(setExportAccess);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => overview(),
    retry: false,
  });

  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [mode, setMode] = useState<"live" | "sandbox">("live");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Opération impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Accès réservé à l'administrateur MiPROJET Go.
      </div>
    );
  }

  const wave = data?.wave;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-primary">Paiements & accès</h1>
          <p className="text-xs text-muted-foreground">Wave, webhooks et déblocage des exports.</p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "Transactions", value: String(data?.totals.count ?? 0) },
          { label: "Confirmées", value: String(data?.totals.completed ?? 0) },
          { label: "Recettes", value: fmt(data?.totals.revenue ?? 0) },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className="font-display font-bold text-primary text-sm mt-1">{k.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Clés Wave</h2>
        </div>
        <div className="grid gap-1 text-[11px] text-muted-foreground">
          <div>
            Clé API :{" "}
            <b className={wave?.apiKeyConfigured ? "text-[var(--success)]" : "text-destructive"}>
              {wave?.apiKeyConfigured ? `${wave.apiKeyMasked} (${wave.apiKeySource})` : "non configurée"}
            </b>
          </div>
          <div>
            Secret webhook :{" "}
            <b className={wave?.webhookSecretConfigured ? "text-[var(--success)]" : "text-destructive"}>
              {wave?.webhookSecretConfigured ? `enregistré (${wave.webhookSecretSource})` : "non configuré"}
            </b>
          </div>
          <div>
            Mode : <b className="text-foreground">{wave?.mode ?? "—"}</b>
          </div>
        </div>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Clé API Wave (wave_sn_prod_…)"
          className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Secret webhook Wave"
          className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "live" | "sandbox")}
          className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm"
        >
          <option value="live">Production (live)</option>
          <option value="sandbox">Test (sandbox)</option>
        </select>
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await saveKeys({
                  data: {
                    ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
                    ...(secret.trim() ? { webhookSecret: secret.trim() } : {}),
                    mode,
                  },
                });
                setApiKey("");
                setSecret("");
              }, "Configuration Wave enregistrée.")
            }
            className="flex-1 h-11 rounded-xl text-primary-foreground text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            Enregistrer
          </button>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const res = await testWave();
                if (!res.ok) throw new Error(res.message);
                toast.info(res.message);
              }, "Connexion Wave vérifiée.")
            }
            className="h-11 px-4 rounded-xl border border-border bg-background text-sm font-semibold text-foreground inline-flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Tester
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Webhook Wave</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Colle cette URL dans le tableau de bord Wave (événements checkout) :
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] break-all rounded-xl bg-background border border-border p-2">
            {wave?.webhookUrl ?? "—"}
          </code>
          <button
            onClick={() => {
              if (wave?.webhookUrl) {
                navigator.clipboard?.writeText(wave.webhookUrl);
                toast.success("URL copiée.");
              }
            }}
            className="h-9 w-9 rounded-xl border border-border bg-background inline-flex items-center justify-center"
            aria-label="Copier l'URL du webhook"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px]">
          Statut :{" "}
          <b className={wave?.webhookVerified ? "text-[var(--success)]" : "text-muted-foreground"}>
            {wave?.webhookVerified
              ? `signature vérifiée — dernier événement ${new Date(wave.lastWebhookAt!).toLocaleString("fr-FR")}`
              : "aucun événement reçu pour l'instant"}
          </b>
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-foreground">Transactions</h2>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-payments"] })}
            className="h-9 px-3 rounded-xl border border-border bg-background text-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Rafraîchir
          </button>
        </div>
        {isLoading && <p className="text-xs text-muted-foreground">Chargement…</p>}
        {!isLoading && (data?.payments.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">Aucun paiement Wave enregistré.</p>
        )}
        <div className="space-y-2">
          {(data?.payments ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{p.userName}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {p.plan} · {p.reference}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString("fr-FR") : "—"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-primary text-sm">{fmt(p.amount)}</div>
                  <div
                    className={`text-[10px] font-semibold ${
                      p.status === "completed"
                        ? "text-[var(--success)]"
                        : p.status === "failed"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {p.status}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => updateStatus({ data: { paymentId: p.id, status: "completed" } }),
                      "Paiement confirmé, exports débloqués.",
                    )
                  }
                  className="h-8 px-3 rounded-lg text-[11px] font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Confirmer
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() => updateStatus({ data: { paymentId: p.id, status: "failed" } }), "Paiement annulé.")
                  }
                  className="h-8 px-3 rounded-lg border border-border text-[11px] font-semibold text-muted-foreground"
                >
                  Annuler
                </button>
                {p.userId && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => updateAccess({ data: { userId: p.userId!, days: 31 } }),
                          "31 jours d'accès accordés.",
                        )
                      }
                      className="h-8 px-3 rounded-lg border border-border text-[11px] font-semibold text-foreground"
                    >
                      +31 j
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(() => updateAccess({ data: { userId: p.userId!, days: 0 } }), "Accès révoqué.")
                      }
                      className="h-8 px-3 rounded-lg border border-destructive/40 text-[11px] font-semibold text-destructive"
                    >
                      Révoquer
                    </button>
                  </>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Exports actifs jusqu'au :{" "}
                {p.exportUntil ? new Date(p.exportUntil).toLocaleString("fr-FR") : "—"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}