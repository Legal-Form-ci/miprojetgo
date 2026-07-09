import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Loader2, ArrowLeft, Package } from "lucide-react";
import { enqueueOperation } from "@/lib/offline-queue";
import { CATEGORIES, PAIEMENTS } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/operations/new")({
  head: () => ({ meta: [{ title: "Nouvelle opération — MiProjet Go" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    type: (s.type === "sortie" ? "sortie" : "entree") as "entree" | "sortie",
    montant: typeof s.montant === "string" ? s.montant : undefined,
    description: typeof s.description === "string" ? s.description : undefined,
    categorie: typeof s.categorie === "string" ? s.categorie : undefined,
    mode: typeof s.mode === "string" ? s.mode : undefined,
    note: typeof s.note === "string" ? s.note : undefined,
  }),
  component: NewOperation,
});

function NewOperation() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const { type } = search;
  const isIn = type === "entree";
  const [montant, setMontant] = useState(search.montant ?? "");
  const [quantite, setQuantite] = useState<string>("1");
  const [prixUnit, setPrixUnit] = useState<string>("");
  const [produitQuery, setProduitQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [description, setDescription] = useState(search.description ?? "");
  const [categorie, setCategorie] = useState(
    search.categorie && CATEGORIES.includes(search.categorie) ? search.categorie : CATEGORIES[0],
  );
  const [mode, setMode] = useState(
    search.mode && PAIEMENTS.includes(search.mode) ? search.mode : PAIEMENTS[0],
  );
  const [note, setNote] = useState(search.note ?? "");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  const { data: produits = [] } = useQuery({
    queryKey: ["produits-pick"],
    queryFn: async () => {
      const { data } = await supabase
        .from("produits")
        .select("id, nom, prix_unitaire, categorie")
        .eq("actif", true)
        .order("nom")
        .limit(200);
      return (data ?? []) as Array<{ id: string; nom: string; prix_unitaire: number; categorie: string }>;
    },
  });

  const suggestions = useMemo(() => {
    const q = produitQuery.trim().toLowerCase();
    if (!q) return produits.slice(0, 8);
    return produits.filter((p) => p.nom.toLowerCase().includes(q)).slice(0, 8);
  }, [produits, produitQuery]);

  // Auto-calcul montant = quantité × prix unitaire
  useEffect(() => {
    const q = Number(quantite.replace(",", "."));
    const pu = Number(prixUnit.replace(/\s/g, "").replace(",", "."));
    if (q > 0 && pu > 0) setMontant(String(Math.round(q * pu)));
  }, [quantite, prixUnit]);

  function pickProduit(p: { nom: string; prix_unitaire: number; categorie: string }) {
    setDescription(p.nom);
    setProduitQuery(p.nom);
    setPrixUnit(String(p.prix_unitaire));
    if (CATEGORIES.includes(p.categorie)) setCategorie(p.categorie);
    setShowSuggest(false);
  }

  const m = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      const payload = {
        user_id: u.user.id,
        type,
        montant: Number(montant.replace(/\s/g, "").replace(",", ".")),
        description: description.trim(),
        categorie,
        mode_paiement: mode,
        note: note.trim() || null,
        date_operation: new Date(date).toISOString(),
        source: "manuel" as const,
      };
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        enqueueOperation(payload);
        return { queued: true };
      }
      try {
        const { error } = await supabase.from("operations").insert(payload);
        if (error) {
          // True backend error (RLS, validation): surface it, do NOT queue.
          throw new Error(error.message);
        }
        return { queued: false };
      } catch (e) {
        // Real network failure (fetch threw) → queue offline.
        const msg = (e as Error)?.message || "";
        if (/network|failed to fetch|load failed/i.test(msg)) {
          enqueueOperation(payload);
          return { queued: true };
        }
        throw e;
      }
    },
    onSuccess: (res) => {
      toast.success(res?.queued ? "Enregistrée hors ligne · sera synchronisée" : "Opération enregistrée ✓");
      qc.invalidateQueries({ queryKey: ["dashboard-ops"] });
      qc.invalidateQueries({ queryKey: ["history-ops"] });
      qc.refetchQueries({ queryKey: ["dashboard-ops"] });
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message || "Erreur d'enregistrement"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(montant.replace(/\s/g, "").replace(",", "."));
    if (!num || num <= 0) return toast.error("Montant invalide");
    if (description.trim().length < 2) return toast.error("Description requise");
    m.mutate();
  }

  const accent = isIn
    ? { from: "#047857", to: "#10b981", text: "text-emerald-700", label: "Entrée" }
    : { from: "#991b1b", to: "#ef4444", text: "text-red-700", label: "Sortie" };

  return (
    <form onSubmit={submit} className="space-y-5">
      <header className="flex items-center gap-3">
        <Link to="/operations" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground/70 hover:text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide text-white`}
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
            {isIn ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />} {accent.label}
          </div>
          <h1 className="font-display text-xl font-bold text-primary mt-1">Nouvelle {accent.label.toLowerCase()}</h1>
        </div>
        <Link to="/produits" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
          <Package className="w-4 h-4" /> Produits
        </Link>
      </header>

      <Field label="Produit (optionnel)">
        <div className="relative">
          <input
            type="text"
            placeholder="Cherche un produit…"
            value={produitQuery}
            onChange={(e) => {
              const v = e.target.value;
              setProduitQuery(v);
              setShowSuggest(true);
              // Sélection via <datalist> (dropdown natif) → auto-remplir
              const exact = produits.find((p) => p.nom === v);
              if (exact) pickProduit(exact);
            }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
            list="produits-datalist"
            className="w-full h-11 px-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <datalist id="produits-datalist">
            {produits.map((p) => (
              <option key={p.id} value={p.nom}>
                {new Intl.NumberFormat("fr-FR").format(p.prix_unitaire)} F · {p.categorie}
              </option>
            ))}
          </datalist>
          {showSuggest && suggestions.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-auto rounded-xl bg-card border border-border shadow-lg">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pickProduit(p)}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between gap-2"
                  >
                    <span className="truncate">{p.nom}</span>
                    <span className="text-primary font-semibold tabular-nums">{new Intl.NumberFormat("fr-FR").format(p.prix_unitaire)} F</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantité">
          <input
            type="text"
            inputMode="decimal"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            className="w-full h-12 px-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
          />
        </Field>
        <Field label="Prix unitaire">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={prixUnit}
            onChange={(e) => setPrixUnit(e.target.value)}
            className="w-full h-12 px-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
          />
        </Field>
      </div>

      <Field label="Montant (FCFA)">
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          placeholder="0"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          className={`w-full h-16 px-4 rounded-xl bg-card border-2 focus:outline-none text-3xl font-display font-bold tabular-nums ${accent.text}`}
          style={{ borderColor: isIn ? "#10b981" : "#ef4444" }}
        />
      </Field>

      <Field label="Description">
        <input
          type="text"
          placeholder="Ex : 1 casier 66"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full h-12 px-4 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie">
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="w-full h-12 px-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Paiement">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full h-12 px-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PAIEMENTS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Date & heure">
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-12 px-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </Field>

      <Field label="Note (facultatif)">
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </Field>

      <button
        type="submit"
        disabled={m.isPending}
        className="w-full h-14 rounded-xl font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`, boxShadow: "var(--shadow-elegant)" }}
      >
        {m.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : `Enregistrer la ${accent.label.toLowerCase()}`}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}