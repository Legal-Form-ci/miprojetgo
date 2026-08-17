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

/**
 * Extension terrain : verbes, argent et produits supplémentaires
 * (dioula, baoulé) + premiers lexiques gouro (kweni) et bété (daloa/gagnoa).
 * Sources : Lexique dioula Braconnier & Derive ; « Les nombres et l'argent »
 * (coastsystems.net) ; dictionnaire gouro-français (Kuznetsova, Mandenkan) ;
 * lexiques bété krou (Zogbo, Marchese).
 */
export const LEXICON_EXT: Entry[] = [
  // ——— Dioula (compléments commerce)
  { lang: "dyu", fr: "vendu", forms: ["n ye feere", "n ka feere", "feerela", "feereli"] },
  { lang: "dyu", fr: "acheté", forms: ["n ye san", "sanni", "sanli"] },
  { lang: "dyu", fr: "reste", forms: ["tɔ", "to", "tola"] },
  { lang: "dyu", fr: "crédit", forms: ["juru", "djourou"] },
  { lang: "dyu", fr: "bénéfice", forms: ["tɔnɔ", "tono"] },
  { lang: "dyu", fr: "client", forms: ["sannikɛla", "sanikela", "kiliyan"] },
  { lang: "dyu", fr: "bouteille", forms: ["butɛli", "buteli", "boutéli"] },
  { lang: "dyu", fr: "casier", forms: ["kaje", "kase", "kasiye"] },
  { lang: "dyu", fr: "bière", forms: ["biyɛri", "biyeri", "dolo"] },
  { lang: "dyu", fr: "huile", forms: ["tulu", "toulou"] },
  { lang: "dyu", fr: "tomate", forms: ["tomati", "tomatu"] },
  { lang: "dyu", fr: "oignon", forms: ["jaba", "djaba"] },
  { lang: "dyu", fr: "sel", forms: ["kɔgɔ", "kogo"] },
  { lang: "dyu", fr: "sucre", forms: ["sukaro", "soukaro"] },
  { lang: "dyu", fr: "pain", forms: ["buru", "bourou"] },
  { lang: "dyu", fr: "poulet", forms: ["sise", "shishè", "sisɛ"] },
  { lang: "dyu", fr: "igname", forms: ["ku", "kou"] },
  { lang: "dyu", fr: "banane", forms: ["banaku", "namasa"] },
  { lang: "dyu", fr: "charbon", forms: ["kaman", "kamanjɛ"] },
  { lang: "dyu", fr: "essence", forms: ["esansi", "essanci"] },
  { lang: "dyu", fr: "aujourd'hui", forms: ["bi", "bii"] },
  { lang: "dyu", fr: "hier", forms: ["kunun", "kounoun"] },
  { lang: "dyu", fr: "matin", forms: ["sɔgɔma", "sogoma"] },
  { lang: "dyu", fr: "soir", forms: ["wula", "woula"] },

  // ——— Baoulé (compléments commerce)
  { lang: "bci", fr: "payé", forms: ["kaci", "n kaci", "tuali"] },
  { lang: "bci", fr: "prix", forms: ["ɲanmiɛn sika", "i ti", "ti"] },
  { lang: "bci", fr: "combien", forms: ["nzɛ", "nze", "sɛ", "ngue"] },
  { lang: "bci", fr: "crédit", forms: ["kalɛ", "kale"] },
  { lang: "bci", fr: "marché", forms: ["gua", "goua", "guaa"] },
  { lang: "bci", fr: "bière", forms: ["biya", "nzan", "nzán"] },
  { lang: "bci", fr: "riz", forms: ["ɛmɔlɛ", "emole", "mɔlɛ"] },
  { lang: "bci", fr: "banane", forms: ["kwadu", "kouadou"] },
  { lang: "bci", fr: "manioc", forms: ["agba", "bɛdɛ", "bede"] },
  { lang: "bci", fr: "poulet", forms: ["akɔ", "ako"] },
  { lang: "bci", fr: "huile", forms: ["ngo", "ngoo"] },
  { lang: "bci", fr: "sel", forms: ["nnyin", "nyin"] },
  { lang: "bci", fr: "bouteille", forms: ["butɛli", "boutéli"] },

  // ——— Gouro / kweni (mandé-sud)
  { lang: "goa", fr: "vendu", forms: ["fere", "féré", "fele", "a fere"] },
  { lang: "goa", fr: "acheté", forms: ["sa", "saa", "a sa"] },
  { lang: "goa", fr: "argent", forms: ["wari", "wali", "waari"] },
  { lang: "goa", fr: "prix", forms: ["sɔnɔ", "sono"] },
  { lang: "goa", fr: "payé", forms: ["sara", "sala"] },
  { lang: "goa", fr: "combien", forms: ["ye", "yle", "jɔlɛ"] },
  { lang: "goa", fr: "riz", forms: ["blo", "bloo"] },
  { lang: "goa", fr: "eau", forms: ["yi", "yii"] },
  { lang: "goa", fr: "viande", forms: ["sonu", "soonu"] },
  { lang: "goa", fr: "poisson", forms: ["gye", "gyee", "jɛ"] },
  { lang: "goa", fr: "marché", forms: ["lo", "loo", "logo"] },
  { lang: "goa", fr: "igname", forms: ["ku", "kuu"] },
  { lang: "goa", fr: "bière", forms: ["dolo", "doolo"] },

  // ——— Bété (krou)
  { lang: "bet", fr: "vendu", forms: ["ylɩ", "yli", "yri", "a yli"] },
  { lang: "bet", fr: "acheté", forms: ["kpa", "kpaa", "a kpa"] },
  { lang: "bet", fr: "argent", forms: ["sɛkɛ", "seke", "gble"] },
  { lang: "bet", fr: "prix", forms: ["gbɛ", "gbe"] },
  { lang: "bet", fr: "payé", forms: ["pɛ", "pe", "pae"] },
  { lang: "bet", fr: "combien", forms: ["nyɛ", "nye", "nyee"] },
  { lang: "bet", fr: "eau", forms: ["nyu", "nyuu", "nyou"] },
  { lang: "bet", fr: "riz", forms: ["mlo", "mloo"] },
  { lang: "bet", fr: "viande", forms: ["nɛmɩ", "nemi", "nami"] },
  { lang: "bet", fr: "poisson", forms: ["gyɛ", "gye", "djè"] },
  { lang: "bet", fr: "igname", forms: ["dou", "duu"] },
  { lang: "bet", fr: "marché", forms: ["gwa", "gwaa"] },
  { lang: "bet", fr: "bière", forms: ["dolo", "koutoukou"] },
];

/** Lexique complet utilisé par le moteur. */
export const ALL_LEXICON: Entry[] = [...LEXICON, ...LEXICON_EXT];

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

/** Nombres gouro et bété (1-10, centaines, milliers). */
export const NUMBERS_EXT: Array<{ lang: LocalLang; forms: string[]; value: number }> = [
  // Gouro (kweni)
  { lang: "goa", value: 1, forms: ["do", "doo"] },
  { lang: "goa", value: 2, forms: ["pla", "plaa", "pila"] },
  { lang: "goa", value: 3, forms: ["yaka", "yaaka"] },
  { lang: "goa", value: 4, forms: ["ziɛ", "zie"] },
  { lang: "goa", value: 5, forms: ["su", "suu", "sou"] },
  { lang: "goa", value: 6, forms: ["salo", "saalo"] },
  { lang: "goa", value: 7, forms: ["sapla", "saapla"] },
  { lang: "goa", value: 8, forms: ["sayaka"] },
  { lang: "goa", value: 9, forms: ["saziɛ", "sazie"] },
  { lang: "goa", value: 10, forms: ["vu", "vuu", "bu"] },
  { lang: "goa", value: 100, forms: ["kɛmɛ", "keme"] },
  { lang: "goa", value: 1000, forms: ["waga", "waka"] },
  // Bété (krou)
  { lang: "bet", value: 1, forms: ["bublɔ", "bublo", "bulo"] },
  { lang: "bet", value: 2, forms: ["sɔ", "so", "soo"] },
  { lang: "bet", value: 3, forms: ["ta", "taa"] },
  { lang: "bet", value: 4, forms: ["mɔnɩ", "moni", "mona"] },
  { lang: "bet", value: 5, forms: ["gbʋ", "gbu", "gbou"] },
  { lang: "bet", value: 6, forms: ["gbʋdʋ", "gbudu"] },
  { lang: "bet", value: 7, forms: ["gbʋsɔ", "gbuso"] },
  { lang: "bet", value: 8, forms: ["gbʋta", "gbuta"] },
  { lang: "bet", value: 9, forms: ["gbʋmɔnɩ", "gbumoni"] },
  { lang: "bet", value: 10, forms: ["kugbʋ", "kougbou", "kugbu"] },
  { lang: "bet", value: 100, forms: ["kɛmɛ", "keme"] },
  { lang: "bet", value: 1000, forms: ["akpi", "waga"] },
];

/** Tous les nombres locaux (dioula, baoulé, gouro, bété). */
export const ALL_NUMBERS = [...NUMBERS, ...NUMBERS_EXT];

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

/** Unités monétaires gouro / bété (base 5 F comme partout en zone CFA locale). */
export const MONEY_UNITS_EXT: Array<{ lang: LocalLang; forms: string[]; fcfa: number }> = [
  { lang: "goa", fcfa: 5, forms: ["dɔrɔmɛ", "dorome", "loloma"] },
  { lang: "goa", fcfa: 1000, forms: ["waga do", "waka do"] },
  { lang: "bet", fcfa: 5, forms: ["dɔlɔmɛ", "dolome", "dorome"] },
  { lang: "bet", fcfa: 1000, forms: ["akpi bublɔ", "akpi bublo"] },
];

/** Toutes les unités monétaires locales. */
export const ALL_MONEY_UNITS = [...MONEY_UNITS, ...MONEY_UNITS_EXT];

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Frontières de mot compatibles avec les caractères africains (ɛ, ɔ, ɲ, ŋ…) :
// \b de JavaScript ne les reconnaît pas comme lettres.
const B1 = "(?<![\\p{L}\\p{N}])";
const B2 = "(?![\\p{L}\\p{N}])";
function wordRe(form: string): RegExp {
  return new RegExp(`${B1}${esc(form)}${B2}`, "giu");
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
      // La quantité peut précéder (dioula : « kɛmɛ dɔrɔmɛ ») ou suivre
      // (baoulé : « kotoku blu ») l'unité monétaire.
      const before = new RegExp(`${B1}([\\p{L}\\p{N}]+)\\s+${esc(form)}${B2}`, "giu");
      const after = new RegExp(`${B1}${esc(form)}\\s+([\\p{L}\\p{N}]+)${B2}`, "giu");
      for (const re of [before, after]) {
        const m = re.exec(text);
        if (!m) continue;
        const qtyRaw = m[1].toLowerCase();
        const qty = /^\d+$/.test(qtyRaw)
          ? Number(qtyRaw)
          : NUMBERS.find((n) => n.forms.includes(qtyRaw))?.value ?? 0;
        if (!qty) continue;
        const amount = qty * unit.fcfa;
        if (amount > fcfa) fcfa = amount;
        matched.push(`${m[0].trim()} = ${amount} FCFA`);
        bump(unit.lang);
        text = text.replace(new RegExp(re.source, "giu"), ` ${amount} francs `);
        break;
      }
    }
  }

  // 2) Nombres locaux → chiffres
  for (const num of NUMBERS) {
    for (const form of num.forms) {
      const re = wordRe(form);
      if (!re.test(text)) continue;
      re.lastIndex = 0;
      matched.push(`${form} = ${num.value}`);
      bump(num.lang);
      text = text.replace(re, ` ${num.value} `);
    }
  }

  // 3) Lexique de commerce → français
  for (const entry of LEXICON) {
    for (const form of entry.forms) {
      const re = wordRe(form);
      if (!re.test(text)) continue;
      re.lastIndex = 0;
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
