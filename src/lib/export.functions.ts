import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const exportSchema = z.object({
  startIso: z.string().datetime().nullable(),
});

type ExportOperation = {
  type: "entree" | "sortie";
  montant: number;
  description: string;
  categorie: string;
  mode_paiement: string;
  date_operation: string;
  note: string | null;
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export const exportHistoryCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => exportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      throw new Error("Export réservé à l'admin.");
    }

    let request = context.supabase
      .from("operations")
      .select("type, montant, description, categorie, mode_paiement, date_operation, note")
      .order("date_operation", { ascending: false })
      .limit(5000);

    if (data.startIso) request = request.gte("date_operation", data.startIso);

    const { data: rows, error } = await request;
    if (error) throw new Error("Export impossible pour le moment.");

    const header = ["Date", "Type", "Montant (FCFA)", "Description", "Catégorie", "Mode", "Note"];
    const body = ((rows ?? []) as ExportOperation[]).map((op) => [
      new Date(op.date_operation).toLocaleString("fr-FR"),
      op.type,
      Number(op.montant),
      op.description,
      op.categorie,
      op.mode_paiement,
      op.note,
    ]);

    return {
      filename: `maestrabook-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n"),
      count: body.length,
    };
  });