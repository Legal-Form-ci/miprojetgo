import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  transcript: z.string().trim().min(2).max(2000),
});

export type VoiceParsedOperation = {
  type: "entree" | "sortie";
  montant: number;
  description: string;
  categorie: string;
  mode_paiement: string;
  note: string | null;
  confidence: "haute" | "moyenne" | "faible";
  raison: string;
};

const CATEGORIES = ["Boissons", "Alimentation", "Carburant", "Divers", "Autre"];
const PAIEMENTS = ["Espèces", "Wave", "MTN Money", "Orange Money", "Moov Money"];

const SYSTEM_PROMPT = `Tu es un assistant intelligent qui transforme une phrase en français (parfois mal prononcée, avec fautes, accents africains, expressions populaires de Côte d'Ivoire) en UNE opération financière pour une cave/petite boutique.

Règles :
- Détecte si c'est une ENTRÉE d'argent (vente, vendu, payé, reçu, encaissé, "il a payé", "j'ai vendu") ou une SORTIE (achat, acheter, "j'ai pris", dépense, payer fournisseur, carburant).
- Calcule le montant total en FCFA : si la phrase dit "2 casiers à 5000" → 10000. Si "casier de 66 à 6500" → 6500.
- Description courte (3-8 mots) qui résume l'article et la quantité.
- Catégorie parmi : ${CATEGORIES.join(", ")}. Devine au mieux.
- Mode de paiement parmi : ${PAIEMENTS.join(", ")}. Par défaut "Espèces" si non mentionné.
- Confidence "haute" si tout est clair, "moyenne" si tu as deviné, "faible" si la phrase est ambiguë.
- Réponds UNIQUEMENT en JSON strict : {"type":"entree|sortie","montant":number,"description":"...","categorie":"...","mode_paiement":"...","note":null|"...","confidence":"haute|moyenne|faible","raison":"explication courte"}.`;

export const parseVoiceOperation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<VoiceParsedOperation> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Service vocal indisponible (clé IA manquante).");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: data.transcript },
        ],
      }),
    });

    if (response.status === 429) throw new Error("Trop de requêtes vocales. Réessaie dans un instant.");
    if (response.status === 402) throw new Error("Crédits IA épuisés. Recharge le projet.");
    if (!response.ok) throw new Error("L'IA n'a pas pu analyser la phrase.");

    const json = await response.json();
    const raw = json?.choices?.[0]?.message?.content;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    } catch {
      throw new Error("Réponse IA illisible. Reformule la phrase.");
    }

    const type = parsed.type === "sortie" ? "sortie" : "entree";
    const montant = Number(parsed.montant);
    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    if (!Number.isFinite(montant) || montant <= 0) throw new Error("Montant non détecté. Cite un chiffre.");
    if (description.length < 2) throw new Error("Description non détectée. Précise l'article.");

    const categorie = CATEGORIES.includes(parsed.categorie as string) ? (parsed.categorie as string) : "Divers";
    const mode = PAIEMENTS.includes(parsed.mode_paiement as string) ? (parsed.mode_paiement as string) : "Espèces";
    const confidence = ["haute", "moyenne", "faible"].includes(parsed.confidence as string)
      ? (parsed.confidence as "haute" | "moyenne" | "faible")
      : "moyenne";

    return {
      type,
      montant: Math.round(montant),
      description,
      categorie,
      mode_paiement: mode,
      note: typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim() : null,
      confidence,
      raison: typeof parsed.raison === "string" ? parsed.raison : "",
    };
  });