import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownCircle, ArrowUpCircle, Wallet, Sparkles } from "lucide-react";
import logo from "@/assets/maestrabook-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — MaestraBook" }] }),
  component: Dashboard,
});

type Op = {
  id: string;
  type: "entree" | "sortie";
  montant: number;
  description: string;
  categorie: string;
  mode_paiement: string;
  date_operation: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-ops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations")
        .select("id, type, montant, description, categorie, mode_paiement, date_operation")
        .order("date_operation", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Op[];
    },
    refetchOnWindowFocus: true,
  });

  const ops = data ?? [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const totEntree = ops.filter((o) => o.type === "entree").reduce((s, o) => s + Number(o.montant), 0);
  const totSortie = ops.filter((o) => o.type === "sortie").reduce((s, o) => s + Number(o.montant), 0);
  const solde = totEntree - totSortie;

  const todayOps = ops.filter((o) => new Date(o.date_operation) >= todayStart);
  const entreeJour = todayOps.filter((o) => o.type === "entree").reduce((s, o) => s + Number(o.montant), 0);
  const sortieJour = todayOps.filter((o) => o.type === "sortie").reduce((s, o) => s + Number(o.montant), 0);

  const last5 = ops.slice(0, 5);

  const paiementStats = todayOps.reduce<Record<string, number>>((acc, o) => {
    acc[o.mode_paiement] = (acc[o.mode_paiement] || 0) + Number(o.montant);
    return acc;
  }, {});
  const totPay = Object.values(paiementStats).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-4 pt-1">
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="absolute inset-0 rounded-2xl blur-xl opacity-50"
            style={{ background: "var(--gradient-gold)" }}
          />
          <img
            src={logo.url}
            alt="MaestraBook"
            className="relative w-20 h-20 object-contain drop-shadow-md"
          />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-primary leading-tight">
            Bonjour Maestra
          </h1>
          <p className="text-xs text-muted-foreground italic mt-0.5">
            Tes comptes. Ton contrôle.
          </p>
        </div>
      </section>

      <section
        className="rounded-3xl p-6 text-primary-foreground relative overflow-hidden"
        style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Wallet className="w-4 h-4" /> Solde actuel
        </div>
        <div className="font-display text-4xl font-bold mt-2">
          {isLoading ? "—" : fmt(solde)}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-2xl bg-white/10 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wide opacity-75 flex items-center gap-1">
              <ArrowUpCircle className="w-3.5 h-3.5" /> Entrées (jour)
            </div>
            <div className="font-semibold text-lg mt-1">{fmt(entreeJour)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wide opacity-75 flex items-center gap-1">
              <ArrowDownCircle className="w-3.5 h-3.5" /> Sorties (jour)
            </div>
            <div className="font-semibold text-lg mt-1">{fmt(sortieJour)}</div>
          </div>
        </div>
        <Sparkles
          className="absolute -right-4 -top-4 w-28 h-28 opacity-10"
          style={{ color: "var(--gold)" }}
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-primary">Modes de paiement (jour)</h2>
        </div>
        {totPay === 0 ? (
          <p className="text-sm text-muted-foreground bg-card rounded-xl p-4 border border-border">
            Aucune opération aujourd'hui.
          </p>
        ) : (
          <div className="bg-card rounded-2xl p-4 border border-border space-y-2.5" style={{ boxShadow: "var(--shadow-card)" }}>
            {Object.entries(paiementStats)
              .sort(([, a], [, b]) => b - a)
              .map(([mode, val]) => {
                const pct = Math.round((val / totPay) * 100);
                return (
                  <div key={mode}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{mode}</span>
                      <span className="text-muted-foreground">{fmt(val)} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, background: "var(--gradient-gold)" }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-primary">Dernières opérations</h2>
          <Link to="/historique" className="text-xs font-semibold text-primary/80 hover:text-primary">
            Voir tout →
          </Link>
        </div>
        {last5.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border text-center">
            <p className="text-sm text-muted-foreground">Pas encore d'opération.</p>
            <Link
              to="/operations/new"
              className="inline-block mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              Saisir la première
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {last5.map((o) => <OpRow key={o.id} op={o} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function OpRow({ op }: { op: Op }) {
  const isIn = op.type === "entree";
  const time = new Date(op.date_operation).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const day = new Date(op.date_operation).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  return (
    <li
      className="bg-card rounded-2xl px-4 py-3 border border-border flex items-center gap-3"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: isIn ? "color-mix(in oklab, var(--success) 18%, transparent)" : "color-mix(in oklab, var(--destructive) 15%, transparent)",
          color: isIn ? "var(--success)" : "var(--destructive)",
        }}
      >
        {isIn ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{op.description}</div>
        <div className="text-[11px] text-muted-foreground">
          {op.categorie} · {op.mode_paiement} · {day} {time}
        </div>
      </div>
      <div className={`font-semibold tabular-nums ${isIn ? "text-[var(--success)]" : "text-destructive"}`}>
        {isIn ? "+" : "−"} {new Intl.NumberFormat("fr-FR").format(Math.round(Number(op.montant)))}
      </div>
    </li>
  );
}