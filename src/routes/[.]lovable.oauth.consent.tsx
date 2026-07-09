import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_URL } from "@/lib/brand";

type OAuthNS = {
  getAuthorizationDetails: (id: string) => Promise<{
    data: { client?: { name?: string }; redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  approveAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  denyAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
};

function oauthNs(): OAuthNS {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.auth as any).oauth as OAuthNS;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthNs().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-xl font-bold text-primary mb-2">Autorisation impossible</h1>
        <p className="text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "une application";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const ns = oauthNs();
    const { data, error } = approve
      ? await ns.approveAuthorization(authorization_id)
      : await ns.denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("Aucune URL de redirection retournée."); return; }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-white">
      <div className="w-full max-w-sm text-center">
        <img src={LOGO_URL} alt="MiProjet Go" className="h-16 w-auto mx-auto mb-6 object-contain" />
        <h1 className="font-display text-xl font-bold text-primary mb-2">
          Connecter {clientName}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {clientName} pourra utiliser MiProjet Go en votre nom (lecture et écriture de vos opérations).
        </p>
        {error && <p role="alert" className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="flex flex-col gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="h-12 rounded-xl font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
          >
            {busy ? "…" : "Autoriser"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="h-12 rounded-xl font-semibold text-muted-foreground border border-border bg-white disabled:opacity-60"
          >
            Refuser
          </button>
        </div>
      </div>
    </main>
  );
}