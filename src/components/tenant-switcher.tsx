import { useState } from "react";
import { ChevronDown, Plus, Check, Store, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { useTenants, TENANT_KINDS, type TenantKind } from "@/lib/tenant";
import { toast } from "sonner";

export function TenantSwitcher({ compact = false }: { compact?: boolean }) {
  const { tenants, active, setActive, add, remove } = useTenants();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nom, setNom] = useState("");
  const [kind, setKind] = useState<TenantKind>("maquis");

  function submit() {
    const trimmed = nom.trim();
    if (!trimmed) return toast.error("Nom requis");
    const meta = TENANT_KINDS.find((k) => k.kind === kind)!;
    add({ nom: trimmed, kind, emoji: meta.emoji });
    toast.success(`Espace « ${trimmed} » activé`);
    setNom("");
    setKind("maquis");
    setCreating(false);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="min-w-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground text-xs font-semibold border border-border/60 hover:border-primary/40 transition-colors"
          title="Changer d'espace d'activité"
        >
          <span aria-hidden className="text-sm leading-none">{active.emoji}</span>
          {!compact && <span className="truncate max-w-[8rem]">{active.nom}</span>}
          <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display flex items-center gap-2 text-primary">
            <Store className="w-5 h-5" /> Espaces d'activité
          </SheetTitle>
          <SheetDescription>
            Chaque espace regroupera ses ventes, dépenses, stocks et équipes de manière isolée.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {tenants.map((t) => {
            const isActive = t.id === active.id;
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                  isActive ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActive(t.id);
                    setOpen(false);
                  }}
                  className="flex-1 flex items-center gap-3 min-w-0 text-left"
                >
                  <span className="text-2xl leading-none">{t.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{t.nom}</span>
                    <span className="block text-[11px] text-muted-foreground capitalize">
                      {TENANT_KINDS.find((k) => k.kind === t.kind)?.label ?? t.kind}
                    </span>
                  </span>
                  {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
                {tenants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Supprimer ${t.nom}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-4 w-full h-12 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary/5"
          >
            <Plus className="w-4 h-4" /> Nouvel espace d'activité
          </button>
        ) : (
          <div className="mt-4 p-4 rounded-2xl border border-border bg-card space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Nom de l'espace</span>
              <input
                autoFocus
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex : Maquis Chez Awa"
                className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
              />
            </label>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Type d'activité</span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {TENANT_KINDS.map((k) => (
                  <button
                    key={k.kind}
                    type="button"
                    onClick={() => setKind(k.kind)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm text-left ${
                      kind === k.kind ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border bg-background"
                    }`}
                  >
                    <span className="text-lg leading-none">{k.emoji}</span>
                    <span className="truncate">{k.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setCreating(false); setNom(""); }}
                className="flex-1 h-11 rounded-xl border border-border font-semibold text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                className="flex-1 h-11 rounded-xl text-primary-foreground font-semibold text-sm"
                style={{ background: "var(--gradient-primary)" }}
              >
                Créer et activer
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground text-center italic">
          Aperçu multi-tenant · l'isolation complète des données sera activée avec la migration base de données.
        </p>
      </SheetContent>
    </Sheet>
  );
}
