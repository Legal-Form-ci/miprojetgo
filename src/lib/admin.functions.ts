import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createVendorSchema = z.object({
  fullName: z.string().trim().min(2, "Nom requis").max(80, "Nom trop long"),
  phone: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().min(8, "Téléphone trop court").max(15, "Téléphone trop long")),
  password: z.string().min(6, "Mot de passe trop court").max(64, "Mot de passe trop long"),
});

export const createVendorAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createVendorSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      throw new Error("Seul l'admin peut créer des comptes vendeurs.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      phone: `+${data.phone}`,
      password: data.password,
      phone_confirm: true,
      user_metadata: { phone: data.phone, full_name: data.fullName },
    });

    if (createError || !created.user) {
      const message = createError?.message?.toLowerCase().includes("already")
        ? "Ce numéro possède déjà un compte."
        : "Impossible de créer le compte vendeur.";
      throw new Error(message);
    }

    const userId = created.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      phone: data.phone,
      full_name: data.fullName,
    });
    if (profileError) throw new Error("Compte créé, mais profil vendeur non enregistré.");

    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "vendeur" });
    if (roleInsertError && !roleInsertError.message.toLowerCase().includes("duplicate")) {
      throw new Error("Compte créé, mais rôle vendeur non attribué.");
    }

    return { id: userId, fullName: data.fullName, phone: data.phone, role: "vendeur" as const };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["admin", "super_admin"])
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("Action réservée aux administrateurs.");
}

export const listUsersOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, phone, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (profilesError || rolesError) throw new Error("Impossible de charger les utilisateurs de l’écosystème.");
    const rolesByUser = new Map<string, string[]>();
    for (const item of roles ?? []) {
      rolesByUser.set(item.user_id, [...(rolesByUser.get(item.user_id) ?? []), item.role]);
    }
    return (profiles ?? []).map((profile) => ({
      ...profile,
      phone: profile.phone ?? "",
      roles: rolesByUser.get(profile.id) ?? ["user"],
    }));
  });

export const syncUserNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, phone, created_at").eq("id", data.userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
    ]);
    if (profileError || rolesError || !profile) throw new Error("Utilisateur introuvable.");

    const payload = {
      app: "miprojet-go",
      event: "account_sync_requested",
      user_id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      roles: (roles ?? []).map((item) => item.role),
      requested_by: context.userId,
    };
    const { data: signalId, error: signalError } = await supabaseAdmin.rpc("emit_sync_signal", {
      _type: "go.account.sync_requested",
      _source_table: "profiles",
      _source_id: profile.id,
      _actor: context.userId,
      _payload: payload,
      _severity: "info",
    });
    if (signalError || !signalId) throw new Error("Le signal de synchronisation n’a pas pu être créé.");

    const { error: runError } = await supabaseAdmin.from("go_sync_runs").insert({
      actor_id: context.userId,
      trigger: "manual_user",
      status: "success",
      roles_pushed: payload.roles.length,
      signal_id: signalId,
      details: payload,
    });
    if (runError) throw new Error("Signal créé, mais journal de synchronisation indisponible.");
    return { ok: true as const, signalId, roleCount: payload.roles.length };
  });