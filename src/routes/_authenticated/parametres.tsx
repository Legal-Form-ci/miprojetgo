import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, Camera, Loader2, MapPin, Save, Settings, Share2, Store, Trash2, Upload } from "lucide-react";
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
  slogan: string | null;
  email: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  website: string | null;
  opening_hours: string | null;
  currency: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[] | null;
};

const CURRENCIES = ["XOF", "XAF", "EUR", "USD", "GHS", "NGN", "MAD", "TND", "DZD", "CDF", "GNF"];
const PHOTO_MIN = 3;
const PHOTO_MAX = 20;

function ActivitySettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { active, rename } = useTenants();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    activity_name: active.nom,
    activity_type: active.kind,
    owner_name: "",
    phone: "",
    address: "",
    city: "",
    description: "",
    slogan: "",
    email: "",
    whatsapp: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    website: "",
    opening_hours: "",
    currency: "XOF",
    latitude: "" as string,
    longitude: "" as string,
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
        .select("*")
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
      slogan: settings.slogan ?? "",
      email: settings.email ?? "",
      whatsapp: settings.whatsapp ?? "",
      facebook: settings.facebook ?? "",
      instagram: settings.instagram ?? "",
      tiktok: settings.tiktok ?? "",
      website: settings.website ?? "",
      opening_hours: settings.opening_hours ?? "",
      currency: settings.currency ?? "XOF",
      latitude: settings.latitude != null ? String(settings.latitude) : "",
      longitude: settings.longitude != null ? String(settings.longitude) : "",
    });
    const ph = Array.isArray(settings.photos) ? (settings.photos as string[]) : [];
    setPhotos(ph);
  }, [settings, active.kind, active.nom]);

  // Générer les URLs signées pour la galerie
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const urls: Record<string, string> = {};
      for (const path of photos) {
        const { data } = await supabase.storage.from("activity-photos").createSignedUrl(path, 3600);
        if (data?.signedUrl) urls[path] = data.signedUrl;
      }
      if (!cancelled) setPhotoUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [photos]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (photos.length + files.length > PHOTO_MAX) {
      return toast.error(`Maximum ${PHOTO_MAX} photos`);
    }
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of files) {
        if (file.size > 6 * 1024 * 1024) { toast.error(`${file.name} > 6 Mo`); continue; }
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("activity-photos").upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
        if (error) { toast.error(error.message); continue; }
        added.push(path);
      }
      if (added.length) setPhotos((p) => [...p, ...added]);
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(path: string) {
    await supabase.storage.from("activity-photos").remove([path]).catch(() => {});
    setPhotos((p) => p.filter((x) => x !== path));
  }

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("GPS indisponible");
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })),
      () => toast.error("Localisation refusée"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function save() {
    if (!userId) return toast.error("Session introuvable");
    if (form.activity_name.trim().length < 2) return toast.error("Nom d'activité requis");
    if (photos.length < PHOTO_MIN) {
      return toast.error(`Ajoute au moins ${PHOTO_MIN} photos de l'activité (${photos.length}/${PHOTO_MIN}).`);
    }
    const isFirstSave = !settings;
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
        slogan: form.slogan.trim() || null,
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        facebook: form.facebook.trim() || null,
        instagram: form.instagram.trim() || null,
        tiktok: form.tiktok.trim() || null,
        website: form.website.trim() || null,
        opening_hours: form.opening_hours.trim() || null,
        currency: form.currency || "XOF",
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        photos,
      };
      const { error } = await supabase
        .from("activity_settings" as never)
        .upsert(payload as never, { onConflict: "user_id" });
      if (error) throw error;
      rename(active.id, payload.activity_name);
      await qc.invalidateQueries({ queryKey: ["activity-settings", userId] });
      toast.success("Paramètres activité enregistrés");
      if (isFirstSave) {
        // Première configuration terminée → aller au dashboard
        setTimeout(() => navigate({ to: "/dashboard" }), 400);
      } else {
        setTimeout(() => navigate({ to: "/profil" }), 400);
      }
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
        <Field label="Slogan (facultatif)">
          <input value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} className="mpg-input" placeholder="Ex: Le goût qui rassemble" />
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
          <Field label="WhatsApp">
            <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} inputMode="tel" className="mpg-input tabular-nums" placeholder="+225 07 …" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mpg-input" />
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Latitude GPS">
            <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="mpg-input tabular-nums" inputMode="decimal" />
          </Field>
          <Field label="Longitude GPS">
            <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="mpg-input tabular-nums" inputMode="decimal" />
          </Field>
          <div className="flex items-end">
            <button type="button" onClick={useMyLocation} className="h-11 w-full rounded-xl border border-border bg-card font-semibold text-primary hover:bg-muted inline-flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4" /> Ma position
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Horaires d'ouverture">
            <input value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })} className="mpg-input" placeholder="Lun-Sam 08h-22h" />
          </Field>
          <Field label="Devise">
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="mpg-input">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description courte">
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mpg-input min-h-24 resize-none py-3" />
        </Field>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2 text-primary">
          <Share2 className="h-4 w-4" />
          <h2 className="font-display font-semibold">Réseaux sociaux & Web</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Facebook"><input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className="mpg-input" placeholder="facebook.com/…" /></Field>
          <Field label="Instagram"><input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="mpg-input" placeholder="@compte" /></Field>
          <Field label="TikTok"><input value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} className="mpg-input" placeholder="@compte" /></Field>
          <Field label="Site web"><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="mpg-input" placeholder="https://…" /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2 text-primary">
          <Camera className="h-4 w-4" />
          <h2 className="font-display font-semibold">
            Photos de l'activité <span className="text-xs font-normal text-muted-foreground">({photos.length}/{PHOTO_MAX} · min {PHOTO_MIN})</span>
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">Ajoute la devanture, l'intérieur, les produits, l'équipe. Minimum 3 recommandé.</p>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                {photoUrls[p] ? (
                  <img src={photoUrls[p]} alt="Photo activité" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">…</div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(p)}
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-red-600"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <label className={`flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border font-semibold text-primary hover:bg-muted ${photos.length >= PHOTO_MAX ? "pointer-events-none opacity-50" : ""}`}>
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {uploading ? "Envoi…" : photos.length >= PHOTO_MAX ? "Limite atteinte" : "Ajouter des photos"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading || photos.length >= PHOTO_MAX} />
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
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
        {photos.length < PHOTO_MIN && (
          <p className="mt-2 text-center text-xs text-red-600">Minimum {PHOTO_MIN} photos requises.</p>
        )}
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