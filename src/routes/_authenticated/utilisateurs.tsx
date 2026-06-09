import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Shield, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  head: () => ({ meta: [{ title: "Utilisateurs — MaestraBook" }] }),
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

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
          <Users className="w-6 h-6" /> Utilisateurs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gère les comptes (admin uniquement).</p>
      </header>

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

      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Ajouter un vendeur</p>
        <p>La création de comptes vendeurs sera disponible dans la prochaine mise à jour. Contacte le support pour ajouter un compte en attendant.</p>
      </div>
    </div>
  );
}
