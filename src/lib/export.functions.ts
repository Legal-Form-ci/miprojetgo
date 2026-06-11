import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const exportSchema = z.object({
  startIso: z.string().datetime().nullable(),
  typeFilter: z.enum(["all", "entree", "sortie"]).default("all"),
  query: z.string().trim().max(80).default(""),
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
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      throw new Error("Export réservé à l'admin.");
    }

    let request = context.supabase
      .from("operations")
      .select("type, montant, description, categorie, mode_paiement, date_operation, note")
      .order("date_operation", { ascending: false })
      .limit(5000);

    if (data.startIso) request = request.gte("date_operation", data.startIso);
    if (data.typeFilter !== "all") request = request.eq("type", data.typeFilter);

    const { data: rows, error } = await request;
    if (error) throw new Error("Export impossible pour le moment.");

    const needle = data.query.toLowerCase();
    const filtered = ((rows ?? []) as ExportOperation[]).filter((op) => {
      if (!needle) return true;
      return [op.description, op.categorie, op.mode_paiement].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });

    const header = ["Date", "Type", "Montant (FCFA)", "Description", "Catégorie", "Mode", "Note"];
    const body = filtered.map((op) => [
      new Date(op.date_operation).toLocaleString("fr-FR"),
      op.type,
      Number(op.montant),
      op.description,
      op.categorie,
      op.mode_paiement,
      op.note,
    ]);

    // Journalise l'export (audit côté serveur)
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("phone")
      .eq("id", context.userId)
      .maybeSingle();
    await (context.supabase as unknown as {
      from: (t: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: unknown }> };
    })
      .from("export_audit_logs")
      .insert({
        admin_user_id: context.userId,
        admin_phone: profile?.phone ?? null,
        periode_start: data.startIso,
        type_filter: data.typeFilter,
        query_text: data.query || null,
        rows_count: body.length,
      });

    return {
      filename: `maestrabook-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n"),
      count: body.length,
    };
  });