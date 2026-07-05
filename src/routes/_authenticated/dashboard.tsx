import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownCircle, ArrowUpCircle, Mic } from "lucide-react";
import { BalanceCard } from "@/components/balance-card";
import { useTenants } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — MiProjet Go" }] }),
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
  const { active: tenant } = useTenants();
  const { data: meta } = useQuery({
    queryKey: ["dashboard-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return { uid: null, isAdmin: false, profile: null };
      const [{ data: roleRow }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, first_name, last_name, phone, avatar_url")
          .eq("id", uid)
          .maybeSingle(),
      ]);
      return {
        uid,
        isAdmin: !!roleRow,
        profile: prof as {
          full_name: string | null;
          first_name: string | null;
          last_name: string | null;
          phone: string;
          avatar_url: string | null;
        } | null,
      };
    },
  });

  const isAdmin = meta?.isAdmin ?? false;
  const uid = meta?.uid ?? null;

  const { data } = useQuery({
    queryKey: ["dashboard-ops", uid, isAdmin],
    enabled: !!uid,
    queryFn: async () => {
      let q = supabase
        .from("operations")
        .select("id, type, montant, description, categorie, mode_paiement, date_operation")
        .order("date_operation", { ascending: false })
        .limit(500);
      if (!isAdmin && uid) q = q.eq("user_id", uid);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Op[];
    },
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const ops = data ?? [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOps = ops.filter((o) => new Date(o.date_operation) >= todayStart);
  const last5 = ops.slice(0, 5);

  const paiementStats = todayOps.reduce<Record<string, number>>((acc, o) => {
    acc[o.mode_paiement] = (acc[o.mode_paiement] || 0) + Number(o.montant);
    return acc;
  }, {});
  const totPay = Object.values(paiementStats).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-primary leading-tight truncate">
          Bonjour {meta?.profile?.first_name || "Entrepreneur"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
          <span aria-hidden>{tenant.emoji}</span>
          <span className="font-semibold text-foreground/80 truncate max-w-[10rem]">{tenant.nom}</span>
          <span className="opacity-60">·</span>
          <span className="italic">
            {isAdmin ? "Vue globale" : "Tes comptes. Ton contrôle."}
          </span>
        </p>
      </header>

      <BalanceCard
        ops={ops}
        isAdmin={isAdmin}
        fullName={
          meta?.profile?.full_name ||
          [meta?.profile?.first_name, meta?.profile?.last_name].filter(Boolean).join(" ") ||
          null
        }
        phone={meta?.profile?.phone ?? null}
        avatarPath={meta?.profile?.avatar_url ?? null}
      />

      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/operations/new"
          search={{ type: "entree" }}
          className="relative overflow-hidden rounded-2xl p-4 text-white active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #047857, #10b981)", boxShadow: "0 12px 30px -12px rgba(16,185,129,0.55)" }}
        >
          <ArrowUpCircle className="w-6 h-6 mb-2" />
          <div className="font-display font-bold text-lg leading-tight">Entrée</div>
          <div className="text-[11px] opacity-90">Argent reçu</div>
        </Link>
        <Link
          to="/operations/new"
          search={{ type: "sortie" }}
          className="relative overflow-hidden rounded-2xl p-4 text-white active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #991b1b, #ef4444)", boxShadow: "0 12px 30px -12px rgba(239,68,68,0.55)" }}
        >
          <ArrowDownCircle className="w-6 h-6 mb-2" />
          <div className="font-display font-bold text-lg leading-tight">Sortie</div>
          <div className="text-[11px] opacity-90">Argent dépensé</div>
        </Link>
      </section>

      <Link
        to="/voix"
        className="relative overflow-hidden rounded-2xl p-4 flex items-center gap-4 text-[#3a2410] active:scale-[0.98] transition-transform"
        style={{ background: "var(--gradient-gold)", boxShadow: "0 14px 32px -14px rgba(217,164,65,0.65)" }}
      >
        <span className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center shrink-0 backdrop-blur">
          <Mic className="w-7 h-7" />
        </span>
        <div className="min-w-0">
          <div className="font-display font-bold text-lg leading-tight">Saisie vocale</div>
          <div className="text-xs opacity-80">Parle, l'IA remplit le formulaire pour toi.</div>
        </div>
      </Link>

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
              to="/operations"
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