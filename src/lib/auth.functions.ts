import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { phoneForSupabase } from "@/lib/phone";

const schema = z.object({
  fullName: z.string().trim().min(2, "Nom requis").max(80, "Nom trop long"),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().min(8, "Numéro trop court").max(15, "Numéro trop long")),
  password: z.string().min(6, "Mot de passe trop court").max(64, "Mot de passe trop long"),
});

/**
 * Inscription par numéro de téléphone uniquement.
 * L'identifiant interne dérive du numéro; le compte est confirmé côté serveur
 * (aucun e-mail envoyé), ce qui évite toute validation d'adresse par Supabase.
 */
export const signUpWithPhone = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      phone: phoneForSupabase(data.phone),
      password: data.password,
      phone_confirm: true,
      user_metadata: { phone: data.phone, full_name: data.fullName },
    });

    if (error || !created.user) {
      const msg = (error?.message ?? "").toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
        throw new Error("Ce numéro a déjà un compte. Connecte-toi.");
      }
      throw new Error("Création impossible. Réessaie dans un instant.");
    }

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, phone: data.phone, full_name: data.fullName } as never, {
        onConflict: "id",
      });

    return { ok: true as const, phone: data.phone };
  });
