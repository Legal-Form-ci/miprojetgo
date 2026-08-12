/**
 * Langues locales de Côte d'Ivoire — lexique de commerce, systèmes monétaires
 * et pré-traduction vers le français avant analyse IA.
 *
 * Sources lexicales :
 * - Dioula (jula/bambara, ISO dyu) : Lexique du dioula, Braconnier & Derive /
 *   coastsystems.net + mandenkan.com (feere = vendre, san = acheter, wari = argent,
 *   da = prix, joli = combien, dɔrɔmɛ = unité de 5 F).
 * - Baoulé (ISO bci) : "Les nombres et l'argent", coastsystems.net
 *   (unité de base = 5 F comptée « kun », pɔnu = 25 F, kotoku = 1000 F).
 * - Gouro (goa) et Bété (bet) : reconnus et traduits par l'IA (dictionnaire
 *   gouro-français, Kuznetsova/Mandenkan) ; le lexique local ci-dessous est
 *   extensible au fur et à mesure des validations terrain.
 */

export type LocalLang = "fr" | "dyu" | "bci" | "goa" | "bet" | "en" | "es";

export type LangMeta = {
  code: LocalLang;
  label: string;
  /** Locale utilisée pour la reconnaissance et la synthèse (aucun moteur navigateur
   *  n'existe pour dyu/bci/goa/bet : on utilise le canal fr-FR, très proche
   *  phonétiquement pour ces langues). */
  speechLocale: string;
  native: boolean;
};

export const LANGS: LangMeta[] = [
  { code: "fr", label: "Français", speechLocale: "fr-FR", native: false },
  { code: "dyu", label: "Dioula", speechLocale: "fr-FR", native: true },
  { code: "bci", label: "Baoulé", speechLocale: "fr-FR", native: true },
  { code: "goa", label: "Gouro", speechLocale: "fr-FR", native: true },
  { code: "bet", label: "Bété", speechLocale: "fr-FR", native: true },
  { code: "en", label: "English", speechLocale: "en-US", native: false },
  { code: "es", label: "Español", speechLocale: "es-ES", native: false },
];

export function speechLocaleFor(lang: string): string {
  return LANGS.find((l) => l.code === lang)?.speechLocale ?? "fr-FR";
}

type Entry = {
  /** Formes écrites et variantes phonétiques probables issues du moteur fr-FR. */
  forms: string[];
  /** Traduction française injectée dans le texte analysé. */
  fr: string;
  lang: LocalLang;
};

/** Lexique de commerce (verbes, argent, produits, paiement). */
export const LEXICON: Entry[] = [
  // ——— Dioula / bambara
  { lang: "dyu", fr: "vendu", forms: ["feere", "fèere", "féré", "fere", "feré", "ka feere"] },
  { lang: "dyu", fr: "acheté", forms: ["san", "ka san", "sanna", "sana"] },
  { lang: "dyu", fr: "argent", forms: ["wari", "ouari"] },
  { lang: "dyu", fr: "prix", forms: ["da", "sɔngɔ", "songo", "songho"] },
  { lang: "dyu", fr: "combien", forms: ["joli", "djoli", "jɔli"] },
  { lang: "dyu", fr: "payé", forms: ["sara", "sarala", "ka sara"] },
  { lang: "dyu", fr: "pris", forms: ["ta", "ka ta"] },
  { lang: "dyu", fr: "riz", forms: ["malo", "malɔ"] },
  { lang: "dyu", fr: "poisson", forms: ["jɛgɛ", "jege", "djégué"] },
  { lang: "dyu", fr: "viande", forms: ["sogo", "sogho"] },
  { lang: "dyu", fr: "piment", forms: ["foronto", "forondo"] },
  { lang: "dyu", fr: "eau", forms: ["ji", "dji"] },
  { lang: "dyu", fr: "marché", forms: ["lɔgɔ", "logo", "logofiye", "lɔgɔfiyɛ"] },

  // ——— Baoulé
  { lang: "bci", fr: "vendu", forms: ["atɔlɛ", "atole", "n yoli atɔlɛ", "yoli atole"] },
  { lang: "bci", fr: "acheté", forms: ["toli", "n toli", "toman"] },
  { lang: "bci", fr: "argent", forms: ["sika", "sica"] },
  { lang: "bci", fr: "casier", forms: ["akpɔ", "akpo"] },
  { lang: "bci", fr: "eau", forms: ["nzue", "nzoué"] },
  { lang: "bci", fr: "igname", forms: ["dwo", "djo"] },
  { lang: "bci", fr: "poisson", forms: ["jue", "djué"] },
  { lang: "bci", fr: "viande", forms: ["nnɛn", "nnen"] },
];

/** Nombres locaux → chiffres. */
export const NUMBERS: Array<{ lang: LocalLang; forms: string[]; value: number }> = [
  // Dioula
  { lang: "dyu", value: 1, forms: ["kelen", "kélen"] },
  { lang: "dyu", value: 2, forms: ["fila", "fla"] },
  { lang: "dyu", value: 3, forms: ["saba"] },
  { lang: "dyu", value: 4, forms: ["naani", "nani"] },
  { lang: "dyu", value: 5, forms: ["duuru", "dourou"] },
  { lang: "dyu", value: 6, forms: ["wɔɔrɔ", "wooro"] },
  { lang: "dyu", value: 7, forms: ["wolonwula", "woronfila"] },
  { lang: "dyu", value: 8, forms: ["segin", "seegin", "ségin"] },
  { lang: "dyu", value: 9, forms: ["kɔnɔntɔn", "kononton"] },
  { lang: "dyu", value: 10, forms: ["tan"] },
  { lang: "dyu", value: 20, forms: ["mugan", "mougan"] },
  { lang: "dyu", value: 100, forms: ["kɛmɛ", "keme", "kémé"] },
  { lang: "dyu", value: 1000, forms: ["waga", "ba"] },
  // Baoulé
  { lang: "bci", value: 1, forms: ["kun"] },
  { lang: "bci", value: 2, forms: ["nnyɔn", "nnyon", "gnon"] },
  { lang: "bci", value: 3, forms: ["nsan"] },
  { lang: "bci", value: 4, forms: ["nnan"] },
  { lang: "bci", value: 5, forms: ["nnun", "nnoun"] },
  { lang: "bci", value: 6, forms: ["nsiɛn", "nsien"] },
  { lang: "bci", value: 7, forms: ["nso", "nsoh"] },
  { lang: "bci", value: 8, forms: ["mɔcuɛ", "mocue"] },
  { lang: "bci", value: 9, forms: ["ngwlan"] },
  { lang: "bci", value: 10, forms: ["blu", "blou"] },
  { lang: "bci", value: 30, forms: ["ablasan"] },
  { lang: "bci", value: 100, forms: ["ya"] },
  { lang: "bci", value: 1000, forms: ["akpi"] },
];

/**
 * Unités monétaires locales → FCFA.
 * Dioula : 1 dɔrɔmɛ = 5 F. Baoulé : l'unité comptée est 5 F,
 * pɔnu = 25 F, kotoku = 1000 F.
 */
export const MONEY_UNITS: Array<{ lang: LocalLang; forms: string[]; fcfa: number }> = [
  { lang: "dyu", fcfa: 5, forms: ["dɔrɔmɛ", "dorome", "drome", "dôrômê"] },
  { lang: "dyu", fcfa: 1000, forms: ["waga kelen", "ba kelen"] },
  { lang: "bci", fcfa: 25, forms: ["pɔnu", "ponu", "ponou", "pɔnɔ"] },
  { lang: "bci", fcfa: 1000, forms: ["kotoku", "kotokun", "kotokou"] },
  { lang: "bci", fcfa: 5, forms: ["ba blu kun"] },
];

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type LocalPreTranslation = {
  /** Texte enrichi en français, prêt pour l'IA ou le parseur hors ligne. */
  text: string;
  /** Langue locale détectée (null si aucune). */
  detected: LocalLang | null;
  /** Montant FCFA déduit d'une unité monétaire locale (0 si aucune). */
  fcfa: number;
  /** Termes locaux reconnus (pour affichage). */
  matched: string[];
};

/**
 * Traduit les termes locaux reconnus vers le français et convertit les unités
 * monétaires locales en FCFA. Ne supprime rien : le texte original reste lisible
 * pour l'IA, qui reçoit la traduction entre crochets.
 */
export function preTranslateLocal(input: string): LocalPreTranslation {
  const original = " " + input.toLowerCase() + " ";
  let text = original;
  const matched: string[] = [];
  const hits: Partial<Record<LocalLang, number>> = {};
  const bump = (l: LocalLang) => (hits[l] = (hits[l] ?? 0) + 1);

  // 1) Unités monétaires : "kɛmɛ dɔrɔmɛ" / "pɔnu blu" → FCFA
  let fcfa = 0;
  for (const unit of MONEY_UNITS) {
    for (const form of unit.forms) {
      const re = new RegExp(`(\\d+|[a-zɛɔɲŋ]+)\\s+${esc(form)}\\b`, "gi");
      const m = re.exec(text);
      if (!m) continue;
      const qtyRaw = m[1];
      const qty = /^\d+$/.test(qtyRaw)
        ? Number(qtyRaw)
        : NUMBERS.find((n) => n.forms.includes(qtyRaw))?.value ?? 1;
      const amount = qty * unit.fcfa;
      if (amount > fcfa) fcfa = amount;
      matched.push(`${qtyRaw} ${form} = ${amount} FCFA`);
      bump(unit.lang);
      text = text.replace(re, ` ${amount} francs `);
    }
  }

  // 2) Nombres locaux → chiffres
  for (const num of NUMBERS) {
    for (const form of num.forms) {
      const re = new RegExp(`\\b${esc(form)}\\b`, "gi");
      if (!re.test(text)) continue;
      matched.push(`${form} = ${num.value}`);
      bump(num.lang);
      text = text.replace(re, ` ${num.value} `);
    }
  }

  // 3) Lexique de commerce → français
  for (const entry of LEXICON) {
    for (const form of entry.forms) {
      const re = new RegExp(`\\b${esc(form)}\\b`, "gi");
      if (!re.test(text)) continue;
      matched.push(`${form} = ${entry.fr}`);
      bump(entry.lang);
      text = text.replace(re, ` ${entry.fr} `);
    }
  }

  const detected =
    (Object.entries(hits).sort((a, b) => b[1] - a[1])[0]?.[0] as LocalLang | undefined) ?? null;

  return {
    text: text.replace(/\s{2,}/g, " ").trim(),
    detected,
    fcfa,
    matched: [...new Set(matched)].slice(0, 12),
  };
}

/**
 * Phrases de retour vocal. Pour dyu/bci on utilise une graphie phonétique
 * française afin que la synthèse fr-FR prononce correctement.
 * Les langues sans phrase validée retombent sur le français.
 */
const PHRASES: Record<string, Partial<Record<LocalLang, string>>> = {
  greeting: {
    dyu: "I ni tché.",
    bci: "Akwaba.",
  },
  thanks: {
    dyu: "A ni tché.",
    bci: "Mo.",
  },
};

export function localPhrase(key: keyof typeof PHRASES, lang: LocalLang): string | null {
  return PHRASES[key]?.[lang] ?? null;
}

/** Récapitulatif parlé : préfixe en langue locale + détail en français. */
export function spokenRecap(
  lang: LocalLang,
  type: "entree" | "sortie",
  description: string,
  montant: number,
): string {
  const prefix = localPhrase("greeting", lang);
  const body =
    type === "entree"
      ? `Vente de ${description} pour ${montant} francs. Confirme ?`
      : `Achat de ${description} pour ${montant} francs. Confirme ?`;
  return prefix ? `${prefix} ${body}` : body;
}
