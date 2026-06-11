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

const FR_NUMBERS: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
  sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13,
  quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40,
  cinquante: 50, soixante: 60, "quatre-vingt": 80, "quatre-vingts": 80,
  cent: 100, cents: 100, mille: 1000, milles: 1000,
};

function normalizeNumbers(text: string): string {
  let t = " " + text.toLowerCase() + " ";
  // "k" / "mille" suffix patterns: "5k", "5 k", "5 mille"
  t = t.replace(/(\d+)\s*(k|mille|milles)\b/gi, (_, n) => String(Number(n) * 1000));
  // single word → digit (basic, helps the AI even if not perfect)
  for (const [word, num] of Object.entries(FR_NUMBERS)) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    t = t.replace(re, String(num));
  }
  return t.trim();
}

function toMontant(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.toLowerCase().replace(/\s|fcfa|f\b|cfa/g, "").replace(",", ".");
  const kMatch = cleaned.match(/^([\d.]+)k$/);
  if (kMatch) return Math.round(Number(kMatch[1]) * 1000);
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const SYSTEM_PROMPT = `Tu es un assistant intelligent qui transforme une phrase en français (parfois mal prononcée, avec fautes, accents africains, expressions populaires de Côte d'Ivoire) en UNE opération financière pour une cave/petite boutique.

Règles :
- Détecte si c'est une ENTRÉE d'argent (vente, vendu, payé, reçu, encaissé, "il a payé", "j'ai vendu") ou une SORTIE (achat, acheter, "j'ai pris", dépense, payer fournisseur, carburant).
- Calcule le montant total en FCFA : si la phrase dit "2 casiers à 5000" → 10000. Si "casier de 66 à 6500" → 6500. Si seul un nombre est cité (ex "j'ai vendu pour 10000"), c'est le montant total.
- Si le montant n'est vraiment pas devinable, mets montant = 0 et confidence = "faible" — n'invente jamais.
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

    const normalized = normalizeNumbers(data.transcript);

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
          { role: "user", content: `Phrase originale : "${data.transcript}"\nPhrase normalisée : "${normalized}"` },
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
    let montant = toMontant(parsed.montant);
    if (!montant) {
      // Fallback: prends le plus grand nombre trouvé dans la phrase normalisée
      const nums = normalized.match(/\d+(?:[.,]\d+)?/g)?.map(Number).filter((n) => n > 0) ?? [];
      if (nums.length) montant = Math.max(...nums);
    }
    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    const safeDescription = description.length >= 2 ? description : data.transcript.slice(0, 60);

    const categorie = CATEGORIES.includes(parsed.categorie as string) ? (parsed.categorie as string) : "Divers";
    const mode = PAIEMENTS.includes(parsed.mode_paiement as string) ? (parsed.mode_paiement as string) : "Espèces";
    let confidence = ["haute", "moyenne", "faible"].includes(parsed.confidence as string)
      ? (parsed.confidence as "haute" | "moyenne" | "faible")
      : "moyenne";
    if (!montant || description.length < 2) confidence = "faible";

    return {
      type,
      montant: Math.round(montant),
      description: safeDescription,
      categorie,
      mode_paiement: mode,
      note: typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim() : null,
      confidence,
      raison: typeof parsed.raison === "string"
        ? parsed.raison + (montant === 0 ? " · Précise le montant sur le formulaire." : "")
        : (montant === 0 ? "Montant à compléter manuellement." : ""),
    };
  });