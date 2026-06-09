import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/operations")({
  head: () => ({ meta: [{ title: "Nouvelle opération — MaestraBook" }] }),
  component: ChoosePage,
});

function ChoosePage() {
  return (
    <div className="space-y-6">
      <header className="text-center pt-4">
        <h1 className="font-display text-3xl font-bold text-primary">Quelle opération ?</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Choisis d'abord — pas d'erreur possible.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 mt-8">
        <Link
          to="/operations/new"
          search={{ type: "entree" }}
          className="group relative overflow-hidden rounded-3xl p-6 text-white transition-transform active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #047857, #10b981)", boxShadow: "0 20px 50px -20px rgba(16,185,129,0.6)" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <ArrowUpCircle className="w-9 h-9" />
            </div>
            <div className="flex-1">
              <div className="font-display text-2xl font-bold">Entrée</div>
              <div className="text-sm opacity-90">Argent qui rentre (vente, recette…)</div>
            </div>
          </div>
          <ArrowUpCircle className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10" />
        </Link>

        <Link
          to="/operations/new"
          search={{ type: "sortie" }}
          className="group relative overflow-hidden rounded-3xl p-6 text-white transition-transform active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #991b1b, #ef4444)", boxShadow: "0 20px 50px -20px rgba(239,68,68,0.6)" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <ArrowDownCircle className="w-9 h-9" />
            </div>
            <div className="flex-1">
              <div className="font-display text-2xl font-bold">Sortie</div>
              <div className="text-sm opacity-90">Argent qui sort (achat, dépense…)</div>
            </div>
          </div>
          <ArrowDownCircle className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10" />
        </Link>
      </div>
    </div>
  );
}
