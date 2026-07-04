import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createVendorAccount } from "@/lib/admin.functions";
import { Users, Shield, User as UserIcon, Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  head: () => ({ meta: [{ title: "Utilisateurs — MiProjet Go" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: UtilisateursPage,
});

type Row = { id: string; full_name: string | null; phone: string; created_at: string; roles: string[] };

function UtilisateursPage() {
  const qc = useQueryClient();
  const createVendor = useServerFn(createVendorAccount);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["users-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users_overview" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const createMutation = useMutation({
    mutationFn: () => createVendor({ data: { fullName, phone, password } }),
    onSuccess: (vendor) => {
      toast.success(`Vendeur créé : ${vendor.phone}`);
      setFullName("");
      setPhone("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["users-overview"] });
    },
    onError: (error: Error) => toast.error(error.message || "Création impossible"),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const cleanedPhone = phone.replace(/\D/g, "");
    if (fullName.trim().length < 2) return toast.error("Nom vendeur requis");
    if (cleanedPhone.length < 8 || cleanedPhone.length > 15) return toast.error("Téléphone invalide");
    if (password.length < 6) return toast.error("Mot de passe temporaire trop court");
    createMutation.mutate();
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
          <Users className="w-6 h-6" /> Utilisateurs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gère les comptes (admin uniquement).</p>
      </header>

      <form onSubmit={submit} className="bg-card rounded-2xl p-4 border border-border space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2 font-display text-lg font-bold text-primary">
          <PlusCircle className="w-5 h-5" /> Ajouter un vendeur
        </div>
        <div className="grid gap-3">
          <Field label="Nom">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nom du vendeur"
              maxLength={80}
              className="w-full h-11 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </Field>
          <Field label="Téléphone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07 00 00 00 00"
              inputMode="numeric"
              maxLength={20}
              className="w-full h-11 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm tabular-nums"
            />
          </Field>
          <Field label="Mot de passe temporaire">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              type="text"
              maxLength={64}
              className="w-full h-11 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full h-11 rounded-xl font-semibold text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "var(--gradient-primary)" }}
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          Créer le vendeur
        </button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <ul className="space-y-2">
          {(data ?? []).map((u) => {
            const isAdmin = u.roles.includes("admin");
            return (
              <li
                key={u.id}
                className="bg-card rounded-2xl px-4 py-3 border border-border flex items-center gap-3"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {isAdmin ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">{u.full_name ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">{u.phone}</div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {isAdmin ? "Admin" : "Vendeur"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">{label}</span>
      {children}
    </label>
  );
}
