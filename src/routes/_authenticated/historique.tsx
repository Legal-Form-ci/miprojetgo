import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { exportHistoryCsv, exportHistoryReport } from "@/lib/export.functions";
import { ArrowDownCircle, ArrowUpCircle, Trash2, Search, Download, FileText, FileSpreadsheet, Lock, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useExportUnlocked, unlockExports, EXPORT_PLANS } from "@/lib/export-lock";

export const Route = createFileRoute("/_authenticated/historique")({
  head: () => ({ meta: [{ title: "Historique — MiProjet Go" }] }),
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
  const exportHistory = useServerFn(exportHistoryCsv);
  const exportReport = useServerFn(exportHistoryReport);
  const [periode, setPeriode] = useState<Periode>("mois");
  const [typeFilter, setTypeFilter] = useState<"all" | "entree" | "sortie">("all");
  const [q, setQ] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [xlsxing, setXlsxing] = useState(false);
  const unlocked = useExportUnlocked();
  const [showUnlock, setShowUnlock] = useState(false);
  const [code, setCode] = useState("");

  function guardExport(action: () => void) {
    if (!unlocked) {
      setShowUnlock(true);
      toast.info("Exports & impression : fonction premium MiProjet");
      return;
    }
    action();
  }
  function submitCode() {
    if (unlockExports(code)) {
      toast.success("Exports débloqués. Merci !");
      setShowUnlock(false);
      setCode("");
    } else {
      toast.error("Code invalide. Vérifie auprès de MiProjet.");
    }
  }

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

  async function handleExport() {
    setExporting(true);
    try {
      const start = startOf(periode);
      const res = await exportHistory({
        data: { startIso: start ? start.toISOString() : null, typeFilter, query: q.trim() },
      });
      if (res.count === 0) return toast.error("Rien à exporter");
      downloadCsv(res.csv, res.filename);
      toast.success(`${res.count} ligne(s) exportée(s)`);
    } catch (error) {
      toast.error((error as Error).message || "Export refusé");
    } finally {
      setExporting(false);
    }
  }

  async function handleReport() {
    setReporting(true);
    try {
      const start = startOf(periode);
      const res = await exportReport({
        data: { startIso: start ? start.toISOString() : null, typeFilter, query: q.trim() },
      });
      if (res.count === 0) return toast.error("Rien à exporter");
      const w = window.open("", "_blank");
      if (!w) return toast.error("Autorise les pop-ups pour ouvrir le rapport");
      w.document.open();
      w.document.write(res.html);
      w.document.close();
      toast.success(`Rapport généré (${res.count} opérations)`);
    } catch (error) {
      toast.error((error as Error).message || "Rapport refusé");
    } finally {
      setReporting(false);
    }
  }

  async function handleExcel() {
    if (ops.length === 0) return toast.error("Rien à exporter");
    setXlsxing(true);
    try {
      const totIn = ops.filter((o) => o.type === "entree").reduce((s, o) => s + Number(o.montant), 0);
      const totOut = ops.filter((o) => o.type === "sortie").reduce((s, o) => s + Number(o.montant), 0);
      const rows = ops.map((o) => {
        const d = new Date(o.date_operation);
        return {
          Date: d.toLocaleDateString("fr-FR"),
          Heure: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          Type: o.type === "entree" ? "Entrée" : "Sortie",
          Description: o.description,
          Catégorie: o.categorie,
          Paiement: o.mode_paiement,
          "Montant (FCFA)": Number(o.montant),
          Note: o.note ?? "",
        };
      });
      rows.push(
        { Date: "", Heure: "", Type: "", Description: "", Catégorie: "", Paiement: "TOTAL ENTRÉES", "Montant (FCFA)": totIn, Note: "" },
        { Date: "", Heure: "", Type: "", Description: "", Catégorie: "", Paiement: "TOTAL SORTIES", "Montant (FCFA)": totOut, Note: "" },
        { Date: "", Heure: "", Type: "", Description: "", Catégorie: "", Paiement: "BÉNÉFICE NET", "Montant (FCFA)": totIn - totOut, Note: "" },
      );
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 32 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Opérations");
      XLSX.writeFile(wb, `miprojet-go-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${ops.length} ligne(s) exportée(s)`);
    } catch (e) {
      toast.error((e as Error).message || "Export Excel impossible");
    } finally {
      setXlsxing(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">Historique</h1>
          <p className="text-sm text-muted-foreground">Filtre, recherche, supprime.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => guardExport(handleReport)}
              disabled={reporting}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-primary-foreground text-xs font-semibold relative"
              style={{ background: "var(--gradient-primary)" }}
            >
              {unlocked ? <FileText className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {reporting ? "Rapport…" : "Rapport PDF"}
            </button>
            <button
              onClick={() => guardExport(handleExcel)}
              disabled={xlsxing}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-card border border-border text-foreground text-xs font-semibold"
            >
              {unlocked ? <FileSpreadsheet className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {xlsxing ? "Excel…" : "Excel"}
            </button>
            <button
              onClick={() => guardExport(handleExport)}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-card border border-border text-foreground text-xs font-semibold"
            >
              {unlocked ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {exporting ? "CSV…" : "CSV"}
            </button>
          </div>
        )}
      </header>

      {isAdmin && !unlocked && (
        <button
          onClick={() => setShowUnlock(true)}
          className="w-full flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-left text-xs"
        >
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span className="min-w-0 flex-1 text-foreground/80">
            <span className="font-semibold text-primary">Consultation libre.</span>{" "}
            Impression, téléchargement et partage — débloquer via un forfait MiProjet.
          </span>
          <span className="shrink-0 font-semibold text-primary underline">Voir</span>
        </button>
      )}

      {showUnlock && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3"
          onClick={() => setShowUnlock(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-card border border-border p-5 space-y-4"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-primary">Débloquer les exports</h3>
                <p className="text-xs text-muted-foreground">
                  Forfaits abordables. Impression, PDF, Excel, CSV et partage inclus.
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {EXPORT_PLANS.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-3 ${p.highlight ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-semibold text-foreground text-sm">{p.label}</div>
                    <div className="text-right">
                      <div className="font-display font-bold text-primary">{p.price}</div>
                      <div className="text-[10px] text-muted-foreground -mt-0.5">{p.period}</div>
                    </div>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {p.perks.map((k) => (
                      <li key={k} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[var(--success)]" /> {k}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-background border border-border p-3 space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
                Code MiProjet
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="MPG-…"
                className="w-full h-11 px-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm uppercase tracking-widest"
              />
              <p className="text-[10px] text-muted-foreground">
                MiProjet t'envoie un code après paiement du forfait choisi.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowUnlock(false)}
                className="flex-1 h-11 rounded-xl border border-border bg-background text-sm font-semibold text-muted-foreground"
              >
                Plus tard
              </button>
              <button
                onClick={submitCode}
                disabled={!code.trim()}
                className="flex-1 h-11 rounded-xl text-primary-foreground text-sm font-semibold disabled:opacity-60"
                style={{ background: "var(--gradient-primary)" }}
              >
                Débloquer
              </button>
            </div>
          </div>
        </div>
      )}

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

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl py-3 px-2" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="font-display font-bold text-lg tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}