import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, Loader2, Save, Settings, Store } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { TENANT_KINDS, type TenantKind, useTenants } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "Paramètres activité — MiProjet Go" }] }),
  component: ActivitySettingsPage,
});

type ActivitySettings = {
  id: string;
  user_id: string;
  activity_name: string;
  activity_type: string;
  owner_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
};

function ActivitySettingsPage() {
  const qc = useQueryClient();
  const { active, rename } = useTenants();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    activity_name: active.nom,
    activity_type: active.kind,
    owner_name: "",
    phone: "",
    address: "",
    city: "",
    description: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: settings } = useQuery({
    queryKey: ["activity-settings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_settings" as never)
        .select("id, user_id, activity_name, activity_type, owner_name, phone, address, city, description")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ActivitySettings | null;
    },
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      activity_name: settings.activity_name || active.nom,
      activity_type: (settings.activity_type || active.kind) as TenantKind,
      owner_name: settings.owner_name ?? "",
      phone: settings.phone ?? "",
      address: settings.address ?? "",
      city: settings.city ?? "",
      description: settings.description ?? "",
    });
  }, [settings, active.kind, active.nom]);

  async function save() {
    if (!userId) return toast.error("Session introuvable");
    if (form.activity_name.trim().length < 2) return toast.error("Nom d'activité requis");
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        activity_name: form.activity_name.trim(),
        activity_type: form.activity_type,
        owner_name: form.owner_name.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        description: form.description.trim() || null,
      };
      const { error } = await supabase
        .from("activity_settings" as never)
        .upsert(payload as never, { onConflict: "user_id" });
      if (error) throw error;
      rename(active.id, payload.activity_name);
      await qc.invalidateQueries({ queryKey: ["activity-settings", userId] });
      toast.success("Paramètres activité enregistrés");
    } catch (e) {
      toast.error((e as Error).message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Settings className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold text-primary leading-tight">Paramètres</h1>
            <p className="text-xs text-muted-foreground">Compte admin et activité.</p>
          </div>
        </div>
        <Store className="h-5 w-5 shrink-0 text-[var(--success)]" />
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2 text-primary">
          <Building2 className="h-4 w-4" />
          <h2 className="font-display font-semibold">Informations de l'activité</h2>
        </div>
        <Field label="Nom de l'activité">
          <input value={form.activity_name} onChange={(e) => setForm({ ...form, activity_name: e.target.value })} className="mpg-input" />
        </Field>
        <Field label="Type d'activité">
          <select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value as TenantKind })} className="mpg-input">
            {TENANT_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.emoji} {k.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom du propriétaire">
            <input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="mpg-input" />
          </Field>
          <Field label="Téléphone activité">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" className="mpg-input tabular-nums" />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Ville / quartier">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mpg-input" />
          </Field>
          <Field label="Adresse">
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mpg-input" />
          </Field>
        </div>
        <Field label="Description courte">
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mpg-input min-h-24 resize-none py-3" />
        </Field>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Enregistrer les paramètres
        </button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">{label}</span>
      {children}
    </label>
  );
}