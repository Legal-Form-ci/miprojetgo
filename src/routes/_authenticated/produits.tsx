import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Package, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/produits")({
  head: () => ({ meta: [{ title: "Mes produits — MaestraBook" }] }),
  component: ProduitsPage,
});

type Produit = {
  id: string;
  nom: string;
  prix_unitaire: number;
  categorie: string;
  unite: string | null;
  actif: boolean;
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
        .select("id, nom, prix_unitaire, categorie, unite, actif")
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
      const payload = {
        user_id: u.user.id,
        nom: p.nom.trim(),
        prix_unitaire: Number(p.prix_unitaire) || 0,
        categorie: p.categorie || "Divers",
        unite: p.unite?.trim() || null,
        actif: p.actif ?? true,
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
        <button
          onClick={() => setEditing({ nom: "", prix_unitaire: 0, categorie: "Boissons", actif: true })}
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-primary-foreground text-sm font-semibold"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="w-4 h-4" /> Nouveau
        </button>
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
          {produits.map((p) => (
            <li key={p.id} className="bg-card rounded-2xl px-4 py-3 border border-border flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.nom}</div>
                <div className="text-[11px] text-muted-foreground">{p.categorie}{p.unite ? ` · ${p.unite}` : ""}</div>
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
          ))}
        </ul>
      )}
    </div>
  );
}