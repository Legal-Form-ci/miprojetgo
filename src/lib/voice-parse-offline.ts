// Fallback local : quand l'IA n'est pas joignable (hors ligne / 402 / 429),
// on extrait les informations minimales par regex pour ne pas bloquer l'utilisateur.
import type { VoiceParsedOperation } from "@/lib/voice-parse.functions";

const FR_NUM: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
  sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20,
  trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100, mille: 1000,
};

function normalize(text: string): string {
  let t = " " + text.toLowerCase() + " ";
  t = t.replace(/(\d+[.,]?\d*)\s*(k|mille)\b/gi, (_, n) => String(Math.round(Number(String(n).replace(",", ".")) * 1000)));
  for (const [w, n] of Object.entries(FR_NUM)) {
    t = t.replace(new RegExp(`\\b${w}\\b`, "gi"), String(n));
  }
  return t.trim();
}

function extractMontant(text: string): number {
  const cleaned = normalize(text).replace(/\s+/g, " ");
  // Cherche le plus gros nombre du message (souvent le montant final)
  const nums = [...cleaned.matchAll(/\b(\d{2,7})\b/g)].map((m) => Number(m[1]));
  if (!nums.length) return 0;
  return Math.max(...nums);
}

function detectType(text: string): "entree" | "sortie" {
  const t = text.toLowerCase();
  const entree = /(vendu|vente|encaiss|pay[eé]|recu|reçu|sold|vendi|entr[eé]e)/;
  const sortie = /(achet|achat|pris|d[eé]pens|fournisseur|carburant|bought|compr[eé]|sortie)/;
  if (entree.test(t)) return "entree";
  if (sortie.test(t)) return "sortie";
  return "entree";
}

function detectMode(text: string): string {
  const t = text.toLowerCase();
  if (/wave/.test(t)) return "Wave";
  if (/mtn/.test(t)) return "MTN Money";
  if (/orange/.test(t)) return "Orange Money";
  if (/moov/.test(t)) return "Moov Money";
  return "Especes";
}

function detectCategorie(text: string): string {
  const t = text.toLowerCase();
  if (/(bi[eè]re|casier|jus|boisson|eau|sucrer|coca|fanta|vin|whisky)/.test(t)) return "Boissons";
  if (/(riz|attieke|attiéké|foutou|poulet|braise|plat)/.test(t)) return "Restauration";
  if (/(viande|boeuf|mouton|porc)/.test(t)) return "Viandes";
  if (/(poisson|thon|machoiron)/.test(t)) return "Poissons";
  if (/(essence|gasoil|carburant)/.test(t)) return "Carburant";
  if (/(l[eé]gume|tomate|oignon|piment)/.test(t)) return "Legumes";
  return "Divers";
}

export function parseVoiceOffline(transcript: string): VoiceParsedOperation {
  const text = transcript.trim();
  const montant = extractMontant(text);
  const type = detectType(text);
  const description = text.length > 80 ? text.slice(0, 80) + "…" : text;
  return {
    type,
    montant,
    description: description || "Opération vocale",
    categorie: detectCategorie(text),
    mode_paiement: detectMode(text),
    note: "Mode hors ligne — vérifier les détails",
    confidence: montant > 0 ? "moyenne" : "faible",
    raison: montant > 0
      ? "Analyse locale (hors ligne). Vérifie le montant et confirme."
      : "Montant non détecté hors ligne. Corrige avant d'enregistrer.",
    lang: "fr",
    price_source: "manuel",
  };
}