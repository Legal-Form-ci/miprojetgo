import { supabase } from "@/integrations/supabase/client";

/**
 * Rôles donnant les droits « responsable d’activité » dans MiPROJET Go.
 * Il n’y a PAS de super-admin dans Go : go_admin ne gère que sa propre activité.
 */
export const ACTIVITY_ADMIN_ROLES = ["go_admin", "admin", "super_admin"] as const;

export const TEAM_ROLES = [
  { value: "gerant", label: "Gérant" },
  { value: "vendeur", label: "Vendeur" },
  { value: "caissier", label: "Caissier" },
  { value: "livreur", label: "Livreur" },
  { value: "autre", label: "Autre" },
] as const;
export type TeamRole = (typeof TEAM_ROLES)[number]["value"];

export function isActivityAdminRoles(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).some((r) => (ACTIVITY_ADMIN_ROLES as readonly string[]).includes(r));
}

/** Vérification côté navigateur (RLS : l’utilisateur ne voit que ses propres rôles). */
export async function fetchIsActivityAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", [...ACTIVITY_ADMIN_ROLES])
    .limit(1);
  return (data?.length ?? 0) > 0;
}
