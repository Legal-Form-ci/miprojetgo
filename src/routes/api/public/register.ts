import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().min(8).max(15)),
  password: z.string().min(6).max(64),
});

export const Route = createFileRoute("/api/public/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: z.infer<typeof registerSchema>;
        try {
          input = registerSchema.parse(await request.json());
        } catch {
          return Response.json(
            { error: "Vérifie le nom, le numéro et le mot de passe." },
            { status: 400 },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          phone: `+${input.phone}`,
          password: input.password,
          phone_confirm: true,
          user_metadata: {
            phone: input.phone,
            full_name: input.fullName,
            source_app: "miprojet-go",
          },
        });

        if (error || !data.user) {
          const message = (error?.message ?? "").toLowerCase();
          const exists =
            message.includes("already") ||
            message.includes("exists") ||
            message.includes("registered");
          return Response.json(
            {
              error: exists
                ? "Ce numéro possède déjà un compte. Connecte-toi."
                : "Création impossible pour le moment. Réessaie dans un instant.",
              code: exists ? "account_exists" : "registration_failed",
            },
            { status: exists ? 409 : 503 },
          );
        }

        return Response.json(
          {
            ok: true,
            role: "user",
            roleLabel: "Responsable d’activité",
            syncStatus: "queued",
          },
          { status: 201 },
        );
      },
    },
  },
});