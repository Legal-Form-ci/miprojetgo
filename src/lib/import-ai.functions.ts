import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateImportLines, type ImportLineInput } from "@/lib/import-ai";

const importInputSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/").max(7_000_000).optional(),
  text: z.string().trim().max(20_000).optional(),
}).refine((data) => data.imageDataUrl || data.text, "Ajoute une photo ou du texte à analyser.");

function parseFallbackText(text: string): ImportLineInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[;,|]/).map((p) => p.trim());
      return {
        description: parts[0],
        quantite: parts[1] ?? "1",
        prix: parts[2],
        type: parts[3] ?? "entree",
        categorie: parts[4] ?? "Import IA",
        mode_paiement: parts[5] ?? "Espèces",
        note: parts[6] ?? null,
      };
    });
}

async function extractWithAi(input: { imageDataUrl?: string; text?: string }) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    if (input.text) return parseFallbackText(input.text);
    throw new Error("Import IA indisponible pour le moment.");
  }

  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: `Extrait les lignes d'opérations financières d'une cave/boutique. Réponds uniquement en JSON valide avec cette forme: {"lignes":[{"description":"...","quantite":1,"prix":1000,"type":"entree|sortie","categorie":"...","mode_paiement":"Espèces|Wave|MTN Money|Orange Money|Moov Money","note":"..."}]}. Si une information manque, devine seulement la catégorie/mode, jamais quantité/prix/type. Texte éventuel: ${input.text ?? ""}`,
    },
  ];
  if (input.imageDataUrl) {
    content.push({ type: "image_url", image_url: { url: input.imageDataUrl } });
  }

  // Fallback : GPT en premier (Claude indisponible sur Lovable AI Gateway),
  // puis Gemini uniquement si les modèles OpenAI échouent.
  const models = [
    "openai/gpt-5-nano",
    "openai/gpt-5-mini",
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.5-flash",
  ];
  for (const model of models) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content }],
        }),
      });
      if (!response.ok) continue;
      const json = await response.json();
      const raw = json?.choices?.[0]?.message?.content;
      const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
      if (Array.isArray(parsed?.lignes)) return parsed.lignes;
    } catch {
      /* try next model */
    }
  }
  if (input.text) return parseFallbackText(input.text);
  throw new Error("Analyse IA impossible. Réessaie ou colle les lignes en texte.");
}

export const analyzeImportLines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => importInputSchema.parse(input))
  .handler(async ({ data }) => {
    const extracted = await extractWithAi(data);
    const lines = validateImportLines(extracted);
    return {
      lines,
      accepted: lines.filter((line) => line.ok).length,
      rejected: lines.filter((line) => !line.ok).length,
    };
  });