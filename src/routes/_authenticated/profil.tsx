import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Camera, Save, Loader2, Shield, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { avatarSignedUrl, cropSquareAndCompress } from "@/lib/avatar";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({ meta: [{ title: "Mon profil — MiProjet Go" }] }),
  component: ProfilPage,
});

type ProfileRow = {
  id: string;
  phone: string;
  full_name: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

function ProfilPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    phone: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [changingPwd, setChangingPwd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      setEditingId(id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  const { data: profile, refetch } = useQuery({
    queryKey: ["profile", editingId],
    enabled: !!editingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, phone, full_name, username, first_name, last_name, avatar_url")
        .eq("id", editingId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        username: profile.username ?? "",
        phone: profile.phone ?? "",
      });
    }
  }, [profile]);

  const { data: avatarUrl } = useQuery({
    queryKey: ["avatar-url", profile?.avatar_url],
    enabled: !!profile?.avatar_url,
    queryFn: () => avatarSignedUrl(profile!.avatar_url),
  });

  const { data: allUsers } = useQuery({
    queryKey: ["all-profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, phone, full_name, first_name, last_name, username, avatar_url");
      return (data ?? []) as ProfileRow[];
    },
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    if (!file.type.startsWith("image/")) return toast.error("Choisis une image");
    setUploading(true);
    try {
      const blob = await cropSquareAndCompress(file, 512, 0.85);
      const path = `${editingId}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path } as never)
        .eq("id", editingId);
      if (updErr) throw updErr;
      toast.success("Photo mise à jour");
      await refetch();
      qc.invalidateQueries({ queryKey: ["dashboard-profile"] });
    } catch (err) {
      toast.error((err as Error).message || "Upload impossible");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!editingId) return;
    setSaving(true);
    try {
      const full = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          username: form.username.trim() || null,
          full_name: full || null,
          phone: form.phone.trim(),
        } as never)
        .eq("id", editingId);
      if (error) throw error;
      toast.success("Profil enregistré");
      qc.invalidateQueries({ queryKey: ["dashboard-profile"] });
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
      refetch();
    } catch (err) {
      toast.error((err as Error).message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (pwd.next.length < 6) return toast.error("Mot de passe : 6 caractères minimum.");
    if (pwd.next !== pwd.confirm) return toast.error("Les mots de passe ne correspondent pas.");
    setChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd.next });
      if (error) throw error;
      setPwd({ next: "", confirm: "" });
      toast.success("Mot de passe mis à jour");
    } catch (err) {
      toast.error((err as Error).message || "Impossible de changer le mot de passe");
    } finally {
      setChangingPwd(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-primary leading-tight">Mon profil</h1>
          <p className="text-xs text-muted-foreground">Photo, nom, contact.</p>
        </div>
      </header>

      {isAdmin && allUsers && allUsers.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
            <Shield className="w-4 h-4" /> Mode admin — éditer un autre profil
          </div>
          <select
            value={editingId ?? ""}
            onChange={(e) => setEditingId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm"
          >
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.full_name || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.username || u.phone) +
                  (u.id === userId ? " (moi)" : "")}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-muted-foreground" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {profile?.full_name || `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Sans nom"}
          </p>
          <p className="text-xs text-muted-foreground truncate">{profile?.phone}</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground"
          >
            <Camera className="w-3.5 h-3.5" />
            Changer la photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
        <Field label="Prénom" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
        <Field label="Nom" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
        <Field label="Nom d'utilisateur" value={form.username} onChange={(v) => setForm({ ...form, username: v })} placeholder="ex: kouame" />
        <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <button
          onClick={save}
          disabled={saving}
          className="w-full h-11 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>

      {editingId === userId && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 text-primary">
            <KeyRound className="w-4 h-4" />
            <h2 className="font-display font-semibold">Sécurité — mot de passe</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Choisis un nouveau mot de passe (6 caractères min).
          </p>
          <div className="space-y-2">
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={pwd.next}
                onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                placeholder="Nouveau mot de passe"
                autoComplete="new-password"
                className="w-full h-11 pl-3 pr-10 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Masquer" : "Afficher"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-muted-foreground hover:text-primary flex items-center justify-center"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input
              type={showPwd ? "text" : "password"}
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              placeholder="Confirmer"
              autoComplete="new-password"
              className="w-full h-11 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
          <button
            onClick={changePassword}
            disabled={changingPwd || !pwd.next || !pwd.confirm}
            className="w-full h-11 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {changingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Changer le mot de passe
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
      />
    </label>
  );
}