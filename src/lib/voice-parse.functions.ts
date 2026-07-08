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
  lang: "fr" | "en" | "es" | "bci";
  price_source: "ia" | "historique" | "manuel";
};

const CATEGORIES = [
  "Boissons",
  "Restauration",
  "Viandes",
  "Poissons",
  "Legumes",
  "Condiments",
  "Alimentation",
  "Carburant",
  "Divers",
  "Autre",
];
const PAIEMENTS = ["Especes", "Wave", "MTN Money", "Orange Money", "Moov Money"];

const FR_NUMBERS: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
  sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13,
  quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40,
  cinquante: 50, soixante: 60, "quatre-vingt": 80, "quatre-vingts": 80,
  cent: 100, cents: 100, mille: 1000, milles: 1000,
};

function normalizeNumbers(text: string): string {
  let t = " " + text.toLowerCase() + " ";
  t = t.replace(/(\d+)\s*(k|mille|milles)\b/gi, (_, n) => String(Number(n) * 1000));
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

function dedupeDescription(text: string): string {
  const tokens = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const tok of tokens) {
    if (out.length && out[out.length - 1].toLowerCase() === tok.toLowerCase()) continue;
    out.push(tok);
  }
  return out.join(" ");
}

const SYSTEM_PROMPT = [
  "Tu transformes une phrase parlee (francais, anglais, espagnol ou baoule de Cote d'Ivoire) en UNE operation financiere pour un commerce (cave, maquis, restaurant, bistro, boutique).",
  "",
  "Regles:",
  "- Detecte la LANGUE: fr | en | es | bci (baoule). Pour le baoule, traduis mentalement en francais (ex: 'n yoli atɔlɛ'='j'ai vendu', 'n toli'='j'ai achete', 'akpɔ'='casier').",
  "- ENTREE: vente, vendu, paye, recu, encaisse, sold, vendi. SORTIE: achat, achete, pris, depense, fournisseur, carburant, bought, compre.",
  "- Calcule le montant total en FCFA. '2 casiers a 5000'=10000. 'casier de 66 a 6500'=6500. Si pas de prix mais un produit nomme: montant=0 (le serveur cherchera dans l'historique).",
  "- Description COURTE (3-8 mots) en FRANCAIS. Nettoie les repetitions ('deux deux bouteilles'='2 bouteilles').",
  "- Categorie parmi: Boissons (biere, vin, sucrerie, jus), Restauration (foutou, attieke, riz, plat), Viandes (boeuf, mouton, cabri, porc, poulet), Poissons, Legumes, Condiments (huile, tomate, oignon, magie, sel), Alimentation, Carburant, Divers, Autre.",
  "- Paiement parmi: Especes, Wave, MTN Money, Orange Money, Moov Money. Defaut: Especes.",
  "- Confidence: 'haute' si tout est clair, 'moyenne' si prix manque ou devine, 'faible' si phrase ambigue.",
  "- Reponds UNIQUEMENT en JSON: {\"type\":\"entree|sortie\",\"montant\":number,\"description\":\"...\",\"categorie\":\"...\",\"mode_paiement\":\"...\",\"note\":null,\"confidence\":\"haute|moyenne|faible\",\"raison\":\"explication courte en francais\",\"lang\":\"fr|en|es|bci\"}.",
].join("\n");

export const parseVoiceOperation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<VoiceParsedOperation> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return fallbackVoice(data.transcript);

    const normalized = normalizeNumbers(data.transcript);
    let raw: unknown;
    // Fallback : GPT d'abord (Claude indisponible sur Lovable AI Gateway),
    // Gemini seulement si les modèles OpenAI échouent.
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
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Phrase originale: "${data.transcript}"\nPhrase normalisee: "${normalized}"` },
            ],
          }),
        });
        if (!response.ok) continue;
        const json = await response.json();
        raw = json?.choices?.[0]?.message?.content;
        if (raw) break;
      } catch {
        /* try next model */
      }
    }
    if (!raw) return fallbackVoice(data.transcript);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    } catch {
      return fallbackVoice(data.transcript);
    }

    const type = parsed.type === "sortie" ? "sortie" : "entree";
    let montant = toMontant(parsed.montant);
    if (!montant) {
      const nums = normalized.match(/\d+(?:[.,]\d+)?/g)?.map(Number).filter((n) => n > 0) ?? [];
      if (nums.length) montant = Math.max(...nums);
    }
    const rawDesc = typeof parsed.description === "string" ? parsed.description.trim() : "";
    const description = dedupeDescription(rawDesc.length >= 2 ? rawDesc : data.transcript.slice(0, 80));

    const categorie = CATEGORIES.includes(parsed.categorie as string) ? (parsed.categorie as string) : "Divers";
    const mode = PAIEMENTS.includes(parsed.mode_paiement as string) ? (parsed.mode_paiement as string) : "Especes";
    let confidence = ["haute", "moyenne", "faible"].includes(parsed.confidence as string)
      ? (parsed.confidence as "haute" | "moyenne" | "faible")
      : "moyenne";
    const lang = (["fr", "en", "es", "bci"].includes(parsed.lang as string) ? parsed.lang : "fr") as
      | "fr" | "en" | "es" | "bci";

    let price_source: "ia" | "historique" | "manuel" = montant ? "ia" : "manuel";
    if (!montant && description.length >= 3) {
      const found = await findHistoricalPrice(context as unknown as AuthCtx, description);
      if (found) {
        montant = found;
        price_source = "historique";
        if (confidence === "faible") confidence = "moyenne";
      }
    }

    if (!montant || description.length < 2) confidence = "faible";

    const baseRaison = typeof parsed.raison === "string" ? parsed.raison : "";
    const raison =
      baseRaison +
      (price_source === "historique" ? " Prix repris de l'historique." : "") +
      (montant === 0 ? " Precise le montant sur le formulaire." : "");

    return {
      type,
      montant: Math.round(montant),
      description,
      categorie,
      mode_paiement: mode,
      note: typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim() : null,
      confidence,
      raison: raison.trim(),
      lang,
      price_source,
    };
  });

function fallbackVoice(transcript: string): VoiceParsedOperation {
  const normalized = normalizeNumbers(transcript);
  const nums = normalized.match(/\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(",", "."))).filter((n) => n > 0) ?? [];
  const type = /achat|achete|acheté|depense|dépense|sortie|fournisseur|carburant/i.test(transcript) ? "sortie" : "entree";
  return {
    type,
    montant: nums.length ? Math.round(Math.max(...nums)) : 0,
    description: dedupeDescription(transcript.slice(0, 80)) || "Operation vocale",
    categorie: "Divers",
    mode_paiement: "Especes",
    note: null,
    confidence: "faible",
    raison: "Analyse simplifiee utilisee. Verifie le montant et la description avant validation.",
    lang: "fr",
    price_source: nums.length ? "manuel" : "manuel",
  };
}

type SbQuery = {
  select: (cols: string) => SbQuery;
  eq: (col: string, val: string) => SbQuery;
  ilike: (col: string, pattern: string) => SbQuery;
  order: (col: string, opts: { ascending: boolean }) => SbQuery;
  limit: (n: number) => Promise<{ data: Array<{ montant: number }> | null }>;
};
type AuthCtx = {
  supabase: { from: (table: string) => SbQuery };
  userId: string;
};

async function findHistoricalPrice(context: AuthCtx, description: string): Promise<number | null> {
  const tokens = description
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !/^\d+$/.test(t))
    .slice(0, 3);
  if (tokens.length === 0) return null;

  const pattern = `%${tokens.join("%")}%`;
  const { data: rows } = await context.supabase
    .from("operations")
    .select("montant")
    .eq("user_id", context.userId)
    .ilike("description", pattern)
    .order("date_operation", { ascending: false })
    .limit(10);

  const filtered = (rows ?? []).filter((r) => r.montant && Number(r.montant) > 0);
  if (filtered.length > 0) return Number(filtered[0].montant);

  // Fallback: premier mot seul
  const single = `%${tokens[0]}%`;
  const { data: rows2 } = await context.supabase
    .from("operations")
    .select("montant")
    .eq("user_id", context.userId)
    .ilike("description", single)
    .order("date_operation", { ascending: false })
    .limit(5);
  const filtered2 = (rows2 ?? []).filter((r) => r.montant && Number(r.montant) > 0);
  return filtered2.length ? Number(filtered2[0].montant) : null;
}