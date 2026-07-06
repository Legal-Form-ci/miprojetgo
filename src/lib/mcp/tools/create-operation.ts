import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "create_operation",
  title: "Create operation",
  description: "Record a new income or expense operation for the signed-in MiProjet Go user.",
  inputSchema: {
    type: z.enum(["entree", "sortie"]).describe("entree = income, sortie = expense"),
    montant: z.number().positive().describe("Amount in FCFA"),
    description: z.string().min(1),
    categorie: z.string().min(1),
    mode_paiement: z.string().min(1).describe("cash, mobile_money, carte, virement, ..."),
    note: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("operations")
      .insert({
        user_id: ctx.getUserId(),
        type: input.type,
        montant: input.montant,
        description: input.description,
        categorie: input.categorie,
        mode_paiement: input.mode_paiement,
        note: input.note ?? null,
        source: "mcp",
        date_operation: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created operation ${data.id}` }],
      structuredContent: { operation: data },
    };
  },
});