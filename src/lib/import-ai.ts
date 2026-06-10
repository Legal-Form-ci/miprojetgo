export type ImportLineInput = {
  description?: string;
  quantite?: number | string;
  prix?: number | string;
  type?: string;
  categorie?: string;
  mode_paiement?: string;
  note?: string | null;
};

export type ValidatedImportLine = {
  line: number;
  ok: boolean;
  errors: string[];
  operation: {
    type: "entree" | "sortie";
    montant: number;
    description: string;
    categorie: string;
    mode_paiement: string;
    note: string | null;
  } | null;
};

function toNumber(value: number | string | undefined) {
  if (typeof value === "number") return value;
  if (!value) return NaN;
  return Number(String(value).replace(/\s/g, "").replace(",", "."));
}

function normalizeType(value: string | undefined): "entree" | "sortie" | null {
  const v = (value ?? "").toLowerCase().trim();
  if (["entree", "entrée", "vente", "recette", "in"].includes(v)) return "entree";
  if (["sortie", "depense", "dépense", "achat", "out"].includes(v)) return "sortie";
  return null;
}

export function validateImportLines(lines: ImportLineInput[]): ValidatedImportLine[] {
  return lines.map((raw, index) => {
    const errors: string[] = [];
    const type = normalizeType(raw.type);
    const quantite = toNumber(raw.quantite);
    const prix = toNumber(raw.prix);
    const description = (raw.description ?? "").trim();

    if (!type) errors.push("Type refusé : choisir entrée ou sortie.");
    if (!Number.isFinite(quantite) || quantite <= 0) errors.push("Quantité invalide.");
    if (!Number.isFinite(prix) || prix <= 0) errors.push("Prix invalide.");
    if (description.length < 2) errors.push("Description trop courte.");

    const montant = Math.round(quantite * prix);
    if (!Number.isFinite(montant) || montant <= 0) errors.push("Montant calculé invalide.");

    return {
      line: index + 1,
      ok: errors.length === 0,
      errors,
      operation: errors.length === 0 && type
        ? {
            type,
            montant,
            description,
            categorie: (raw.categorie ?? "Import IA").trim() || "Import IA",
            mode_paiement: (raw.mode_paiement ?? "Espèces").trim() || "Espèces",
            note: raw.note?.trim() || null,
          }
        : null,
    };
  });
}