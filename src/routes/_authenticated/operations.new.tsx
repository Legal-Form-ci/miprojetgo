import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import { enqueueOperation } from "@/lib/offline-queue";

export const Route = createFileRoute("/_authenticated/operations/new")({
  head: () => ({ meta: [{ title: "Nouvelle opération — MaestraBook" }] }),
  component: NewOperation,
});

const CATEGORIES = ["Boissons", "Alimentation", "Carburant", "Divers", "Autre"];
const PAIEMENTS = ["Espèces", "Wave", "MTN Money", "Orange Money", "Moov Money"];

function NewOperation() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [type, setType] = useState<"entree" | "sortie">("entree");
  const [montant, setMontant] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState(CATEGORIES[0]);
  const [mode, setMode] = useState(PAIEMENTS[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

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
      const { error } = await supabase.from("operations").insert(payload);
      if (error) {
        // network failure → queue
        enqueueOperation(payload);
        return { queued: true };
      }
      return { queued: false };
    },
    onSuccess: (res) => {
      toast.success(res?.queued ? "Enregistrée hors ligne · sera synchronisée" : "Opération enregistrée");
      qc.invalidateQueries({ queryKey: ["dashboard-ops"] });
      qc.invalidateQueries({ queryKey: ["history-ops"] });
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

  return (
    <form onSubmit={submit} className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-primary">Nouvelle opération</h1>
        <p className="text-sm text-muted-foreground mt-1">Saisis-la en moins de 15 secondes.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-secondary">
        <button
          type="button"
          onClick={() => setType("entree")}
          className={`h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            type === "entree" ? "text-primary-foreground" : "text-muted-foreground"
          }`}
          style={type === "entree" ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-card)" } : undefined}
        >
          <ArrowUpCircle className="w-5 h-5" /> Entrée
        </button>
        <button
          type="button"
          onClick={() => setType("sortie")}
          className={`h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            type === "sortie" ? "text-primary-foreground bg-destructive shadow" : "text-muted-foreground"
          }`}
        >
          <ArrowDownCircle className="w-5 h-5" /> Sortie
        </button>
      </div>

      <Field label="Montant (FCFA)">
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          placeholder="0"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          className="w-full h-14 px-4 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-2xl font-display font-bold text-primary tabular-nums"
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
        className="w-full h-14 rounded-xl font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
      >
        {m.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enregistrer l'opération"}
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