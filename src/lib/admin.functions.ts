import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const phoneToEmail = (phone: string) => `${phone.replace(/\D/g, "")}@miprojet.app`;

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
    const email = phoneToEmail(data.phone);

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
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