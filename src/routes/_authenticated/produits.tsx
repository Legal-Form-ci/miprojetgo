import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Package, Loader2, Save, X, AlertTriangle, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/produits")({
  head: () => ({ meta: [{ title: "Mes produits — MiProjet Go" }] }),
  component: ProduitsPage,
});

type Produit = {
  id: string;
  nom: string;
  prix_unitaire: number;
  categorie: string;
  unite: string | null;
  actif: boolean;
  stock_actuel?: number | null;
  seuil_alerte?: number | null;
  stock_actif?: boolean | null;
};

const CATS = ["Boissons", "Restauration", "Viandes", "Poissons", "Legumes", "Condiments", "Alimentation", "Carburant", "Divers", "Autre"];

function ProduitsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Produit> | null>(null);

  const { data: produits = [], isLoading } = useQuery({
    queryKey: ["produits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produits")
        .select("id, nom, prix_unitaire, categorie, unite, actif, stock_actuel, seuil_alerte, stock_actif")
        .order("nom");
      if (error) throw error;
      return (data ?? []) as Produit[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<Produit>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      if (!p.nom?.trim()) throw new Error("Nom requis");
      const payload: Record<string, unknown> = {
        user_id: u.user.id,
        nom: p.nom.trim(),
        prix_unitaire: Number(p.prix_unitaire) || 0,
        categorie: p.categorie || "Divers",
        unite: p.unite?.trim() || null,
        actif: p.actif ?? true,
        stock_actuel: p.stock_actuel != null ? Number(p.stock_actuel) : null,
        seuil_alerte: p.seuil_alerte != null ? Number(p.seuil_alerte) : null,
        stock_actif: p.stock_actif ?? false,
      };
      if (p.id) {
        const { error } = await supabase.from("produits").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produits").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Enregistré");
      qc.invalidateQueries({ queryKey: ["produits"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["produits"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function csvCell(v: string | number | null | undefined) {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function exportCSV() {
    const header = ["Nom", "Categorie", "Prix unitaire", "Unite", "Stock actuel", "Seuil alerte", "Actif"];
    const body = produits.map((p) => [
      p.nom, p.categorie, p.prix_unitaire, p.unite ?? "",
      p.stock_actuel ?? "", p.seuil_alerte ?? "", p.actif ? "oui" : "non",
    ]);
    const csv = [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produits-miprojet-go-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${produits.length} produits exportés`);
  }
  function exportXLSX() {
    const rows = produits.map((p) => ({
      Nom: p.nom, Categorie: p.categorie,
      "Prix unitaire": p.prix_unitaire, Unite: p.unite ?? "",
      "Stock actuel": p.stock_actuel ?? "", "Seuil alerte": p.seuil_alerte ?? "",
      Actif: p.actif ? "oui" : "non",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produits");
    XLSX.writeFile(wb, `produits-miprojet-go-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${produits.length} produits exportés`);
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-gold)", color: "#3a2410" }}>
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-primary">Mes produits</h1>
            <p className="text-xs text-muted-foreground">{produits.length} référence(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {produits.length > 0 && (
            <>
              <button onClick={exportCSV} title="Export CSV" className="h-10 px-3 rounded-xl border border-border bg-card text-sm font-semibold inline-flex items-center gap-1.5">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={exportXLSX} title="Export Excel" className="h-10 px-3 rounded-xl border border-border bg-card text-sm font-semibold inline-flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
            </>
          )}
          <button
            onClick={() => setEditing({ nom: "", prix_unitaire: 0, categorie: "Boissons", actif: true, stock_actif: false })}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-primary-foreground text-sm font-semibold"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="w-4 h-4" /> Nouveau
          </button>
        </div>
      </header>

      {editing && (
        <div className="rounded-2xl border-2 border-primary/40 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-primary">{editing.id ? "Modifier" : "Nouveau produit"}</h2>
            <button onClick={() => setEditing(null)}><X className="w-4 h-4" /></button>
          </div>
          <input
            placeholder="Nom (ex: Casier 66)"
            value={editing.nom ?? ""}
            onChange={(e) => setEditing({ ...editing, nom: e.target.value })}
            className="w-full h-11 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Prix unitaire"
              value={editing.prix_unitaire ?? ""}
              onChange={(e) => setEditing({ ...editing, prix_unitaire: Number(e.target.value) })}
              className="h-11 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              placeholder="Unité (litre, kg…)"
              value={editing.unite ?? ""}
              onChange={(e) => setEditing({ ...editing, unite: e.target.value })}
              className="h-11 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={editing.categorie ?? "Divers"}
            onChange={(e) => setEditing({ ...editing, categorie: e.target.value })}
            className="w-full h-11 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editing.stock_actif ?? false}
              onChange={(e) => setEditing({ ...editing, stock_actif: e.target.checked })}
            />
            Gérer le stock de ce produit
          </label>
          {editing.stock_actif && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Stock actuel"
                value={editing.stock_actuel ?? ""}
                onChange={(e) => setEditing({ ...editing, stock_actuel: e.target.value === "" ? null : Number(e.target.value) })}
                className="h-11 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="number"
                placeholder="Seuil d'alerte"
                value={editing.seuil_alerte ?? ""}
                onChange={(e) => setEditing({ ...editing, seuil_alerte: e.target.value === "" ? null : Number(e.target.value) })}
                className="h-11 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          <button
            onClick={() => save.mutate(editing)}
            disabled={save.isPending}
            className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            {save.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Enregistrer
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : produits.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-card rounded-xl p-6 text-center border border-border">
          Aucun produit. Ajoute tes articles pour saisir plus vite.
        </p>
      ) : (
        <ul className="space-y-2">
          {produits.map((p) => {
            const stockManaged = p.stock_actif && p.stock_actuel != null;
            const lowStock = stockManaged && p.seuil_alerte != null && Number(p.stock_actuel) <= Number(p.seuil_alerte);
            return (
            <li key={p.id} className={`bg-card rounded-2xl px-4 py-3 border flex items-center gap-3 ${lowStock ? "border-destructive/40" : "border-border"}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                  {p.nom}
                  {lowStock && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> Stock bas
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {p.categorie}{p.unite ? ` · ${p.unite}` : ""}
                  {stockManaged && ` · Stock : ${p.stock_actuel}${p.unite ? " " + p.unite : ""}`}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums text-primary">
                {new Intl.NumberFormat("fr-FR").format(p.prix_unitaire)} F
              </div>
              <button onClick={() => setEditing(p)} className="w-8 h-8 rounded-full text-muted-foreground hover:text-primary flex items-center justify-center">
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => { if (confirm(`Supprimer "${p.nom}" ?`)) del.mutate(p.id); }}
                className="w-8 h-8 rounded-full text-muted-foreground hover:text-destructive flex items-center justify-center"
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