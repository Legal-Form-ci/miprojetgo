import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ChangeEvent } from "react";
import { Camera, CheckCircle2, AlertTriangle, Loader2, Save, XCircle } from "lucide-react";
import { toast } from "sonner";

import { analyzeImportLines } from "@/lib/import-ai.functions";
import type { ValidatedImportLine } from "@/lib/import-ai";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Import IA — MaestraBook" }] }),
  component: ImportPage,
});

type ValidLine = ValidatedImportLine;

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function ImportPage() {
  const analyze = useServerFn(analyzeImportLines);
  const qc = useQueryClient();
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [lines, setLines] = useState<ValidLine[]>([]);

  const accepted = useMemo(() => lines.filter((line) => line.ok && line.operation), [lines]);
  const rejected = lines.filter((line) => !line.ok);
  const total = accepted.reduce((sum, line) => sum + Number(line.operation?.montant ?? 0), 0);

  const analyzeMutation = useMutation({
    mutationFn: () => analyze({ data: { imageDataUrl, text: text.trim() || undefined } }),
    onSuccess: (result) => {
      setLines(result.lines);
      toast.success(`${result.accepted} ligne(s) acceptée(s), ${result.rejected} rejetée(s)`);
    },
    onError: (error: Error) => toast.error(error.message || "Analyse impossible"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non connecté");
      const payload = accepted.map((line) => ({
        ...line.operation!,
        user_id: userData.user.id,
        date_operation: new Date().toISOString(),
        source: "import_ia" as const,
      }));
      if (payload.length === 0) throw new Error("Aucune ligne valide à enregistrer");
      const { error } = await supabase.from("operations").insert(payload);
      if (error) throw new Error(error.message);
      await supabase.from("import_sessions").insert({
        user_id: userData.user.id,
        statut: rejected.length > 0 ? "partiel" : "valide",
        operations_extraites: lines,
      });
      return payload.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} opération(s) importée(s)`);
      setLines([]);
      setImageDataUrl(undefined);
      setText("");
      qc.invalidateQueries({ queryKey: ["dashboard-ops"] });
      qc.invalidateQueries({ queryKey: ["history-ops"] });
    },
    onError: (error: Error) => toast.error(error.message || "Enregistrement impossible"),
  });

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choisis une image");
    if (file.size > 6_000_000) return toast.error("Image trop lourde");
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
          <Camera className="w-6 h-6" /> Import IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Photo ou texte, validation avant enregistrement.</p>
      </header>

      <section className="bg-card border border-border rounded-2xl p-4 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Photo du cahier/reçu</span>
          <input type="file" accept="image/*" capture="environment" onChange={onFile} className="w-full text-sm" />
        </label>
        {imageDataUrl && <img src={imageDataUrl} alt="Aperçu import" className="w-full max-h-52 object-contain rounded-xl bg-muted" />}
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Texte manuel (secours)</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Une ligne par opération : description ; quantité ; prix ; entrée/sortie"
            rows={4}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
          />
        </label>
        <button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending || (!imageDataUrl && !text.trim())}
          className="w-full h-12 rounded-xl text-primary-foreground font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "var(--gradient-primary)" }}
        >
          {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          Analyser
        </button>
      </section>

      {lines.length > 0 && (
        <section className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Acceptées" value={String(accepted.length)} tone="ok" />
            <Stat label="Rejetées" value={String(rejected.length)} tone="bad" />
            <Stat label="Total" value={fmt(total)} tone="neutral" />
          </div>
          <ul className="space-y-2">
            {lines.map((line) => (
              <li key={line.line} className="bg-card border border-border rounded-2xl p-3" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex items-start gap-3">
                  {line.ok ? <CheckCircle2 className="w-5 h-5 text-[var(--success)] mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">Ligne {line.line}</div>
                    {line.operation ? (
                      <div className="text-xs text-muted-foreground">
                        {line.operation.description} · {line.operation.type} · {fmt(line.operation.montant)} FCFA
                      </div>
                    ) : (
                      <div className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {line.errors.join(" ")}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || accepted.length === 0}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer les lignes acceptées
          </button>
        </section>
      )}

      <Link to="/operations" className="block text-center text-sm font-semibold text-primary">
        Saisir manuellement
      </Link>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "ok" | "bad" | "neutral" }) {
  const color = tone === "ok" ? "var(--success)" : tone === "bad" ? "var(--destructive)" : "var(--primary)";
  return (
    <div className="bg-card border border-border rounded-2xl py-3 px-2" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="font-display text-lg font-bold tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}