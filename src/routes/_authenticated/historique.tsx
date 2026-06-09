import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownCircle, ArrowUpCircle, Trash2, Search, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/historique")({
  head: () => ({ meta: [{ title: "Historique — MaestraBook" }] }),
  component: History,
});

type Op = {
  id: string;
  type: "entree" | "sortie";
  montant: number;
  description: string;
  categorie: string;
  mode_paiement: string;
  date_operation: string;
  note: string | null;
};

const PERIODES = [
  { k: "jour", label: "Jour" },
  { k: "semaine", label: "Semaine" },
  { k: "mois", label: "Mois" },
  { k: "trimestre", label: "Trimestre" },
  { k: "semestre", label: "Semestre" },
  { k: "annee", label: "Année" },
  { k: "tout", label: "Tout" },
] as const;
type Periode = (typeof PERIODES)[number]["k"];

function startOf(p: Periode): Date | null {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  switch (p) {
    case "jour": return d;
    case "semaine": { const x = new Date(d); x.setDate(d.getDate() - 6); return x; }
    case "mois": return new Date(d.getFullYear(), d.getMonth(), 1);
    case "trimestre": return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
    case "semestre": return new Date(d.getFullYear(), d.getMonth() < 6 ? 0 : 6, 1);
    case "annee": return new Date(d.getFullYear(), 0, 1);
    case "tout": return null;
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function History() {
  const qc = useQueryClient();
  const [periode, setPeriode] = useState<Periode>("mois");
  const [typeFilter, setTypeFilter] = useState<"all" | "entree" | "sortie">("all");
  const [q, setQ] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: u }) => {
      if (!u.user) return;
      supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    });
  }, []);

  const { data } = useQuery({
    queryKey: ["history-ops", periode],
    queryFn: async () => {
      let req = supabase
        .from("operations")
        .select("id, type, montant, description, categorie, mode_paiement, date_operation, note")
        .order("date_operation", { ascending: false })
        .limit(1000);
      const start = startOf(periode);
      if (start) req = req.gte("date_operation", start.toISOString());
      const { data, error } = await req;
      if (error) throw error;
      return (data ?? []) as Op[];
    },
  });

  const ops = useMemo(() => {
    let list = data ?? [];
    if (typeFilter !== "all") list = list.filter((o) => o.type === typeFilter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.description.toLowerCase().includes(needle) ||
          o.categorie.toLowerCase().includes(needle) ||
          o.mode_paiement.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [data, typeFilter, q]);

  const totIn = ops.filter((o) => o.type === "entree").reduce((s, o) => s + Number(o.montant), 0);
  const totOut = ops.filter((o) => o.type === "sortie").reduce((s, o) => s + Number(o.montant), 0);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supprimée");
      qc.invalidateQueries({ queryKey: ["history-ops"] });
      qc.invalidateQueries({ queryKey: ["dashboard-ops"] });
    },
    onError: () => toast.error("Suppression refusée"),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">Historique</h1>
          <p className="text-sm text-muted-foreground">Filtre, recherche, supprime.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => exportCsv(ops)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </header>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none">
        {PERIODES.map((p) => (
          <button
            key={p.k}
            onClick={() => setPeriode(p.k)}
            className={`px-4 h-9 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              periode === p.k
                ? "text-primary-foreground"
                : "bg-card border border-border text-muted-foreground"
            }`}
            style={periode === p.k ? { background: "var(--gradient-primary)" } : undefined}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["all", "entree", "sortie"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTypeFilter(k)}
            className={`h-10 rounded-xl text-xs font-semibold ${
              typeFilter === k
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {k === "all" ? "Tout" : k === "entree" ? "Entrées" : "Sorties"}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher…"
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Entrées" value={fmt(totIn)} color="var(--success)" />
        <Stat label="Sorties" value={fmt(totOut)} color="var(--destructive)" />
        <Stat label="Solde" value={fmt(totIn - totOut)} color="var(--primary)" />
      </div>

      {ops.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-card rounded-xl p-6 text-center border border-border">
          Aucune opération pour ce filtre.
        </p>
      ) : (
        <ul className="space-y-2">
          {ops.map((o) => {
            const isIn = o.type === "entree";
            const d = new Date(o.date_operation);
            return (
              <li
                key={o.id}
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
                  <div className="text-sm font-semibold text-foreground truncate">{o.description}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {o.categorie} · {o.mode_paiement} · {d.toLocaleDateString("fr-FR")} {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className={`font-semibold tabular-nums text-sm ${isIn ? "text-[var(--success)]" : "text-destructive"}`}>
                  {isIn ? "+" : "−"} {fmt(Number(o.montant))}
                </div>
                <button
                  onClick={() => {
                    if (confirm("Supprimer cette opération ?")) del.mutate(o.id);
                  }}
                  className="w-8 h-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center"
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function exportCsv(ops: Op[]) {
  if (ops.length === 0) return toast.error("Rien à exporter");
  const header = ["Date", "Type", "Montant (FCFA)", "Description", "Catégorie", "Mode", "Note"];
  const rows = ops.map((o) => [
    new Date(o.date_operation).toLocaleString("fr-FR"),
    o.type,
    String(o.montant),
    o.description.replace(/"/g, '""'),
    o.categorie,
    o.mode_paiement,
    (o.note ?? "").replace(/"/g, '""'),
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `maestrabook-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast.success(`${ops.length} ligne(s) exportée(s)`);
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl py-3 px-2" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="font-display font-bold text-lg tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}