export type Tier = {
  name: string;
  label: string;
  gradient: string;
  shadow: string;
  textColor: string;
  accent: string;
};

export const TIER_NEGATIVE: Tier = {
  name: "deficit",
  label: "Découvert",
  gradient: "linear-gradient(135deg, #4a0d12 0%, #991b1b 55%, #ef4444 100%)",
  shadow: "0 22px 50px -18px rgba(153,27,27,0.65)",
  textColor: "#ffffff",
  accent: "rgba(255,255,255,0.18)",
};

const TIERS: Array<{ min: number; tier: Tier }> = [
  {
    min: 0,
    tier: {
      name: "bronze",
      label: "Bronze",
      gradient: "linear-gradient(135deg, #4a2410 0%, #8b4513 55%, #cd7f32 100%)",
      shadow: "0 22px 50px -18px rgba(139,69,19,0.6)",
      textColor: "#fff8ee",
      accent: "rgba(255,255,255,0.15)",
    },
  },
  {
    min: 50_000,
    tier: {
      name: "argent",
      label: "Argent",
      gradient: "linear-gradient(135deg, #3a3a44 0%, #8a8d99 55%, #d8dde6 100%)",
      shadow: "0 22px 50px -18px rgba(138,141,153,0.55)",
      textColor: "#1a1d24",
      accent: "rgba(0,0,0,0.10)",
    },
  },
  {
    min: 200_000,
    tier: {
      name: "or",
      label: "Or",
      gradient: "linear-gradient(135deg, #6b4a10 0%, #c49a3a 50%, #f4d77a 100%)",
      shadow: "0 22px 50px -18px rgba(196,154,58,0.65)",
      textColor: "#2a1a05",
      accent: "rgba(0,0,0,0.12)",
    },
  },
  {
    min: 1_000_000,
    tier: {
      name: "saphir",
      label: "Saphir",
      gradient: "linear-gradient(135deg, #07142e 0%, #1e3a8a 55%, #3b82f6 100%)",
      shadow: "0 22px 50px -18px rgba(30,58,138,0.7)",
      textColor: "#eaf2ff",
      accent: "rgba(255,255,255,0.16)",
    },
  },
  {
    min: 5_000_000,
    tier: {
      name: "diamant",
      label: "Diamant",
      gradient: "linear-gradient(135deg, #0a3b3a 0%, #14b8a6 50%, #a5f3fc 100%)",
      shadow: "0 22px 50px -18px rgba(20,184,166,0.65)",
      textColor: "#04211f",
      accent: "rgba(255,255,255,0.22)",
    },
  },
];

export function getTier(solde: number): Tier {
  if (solde < 0) return TIER_NEGATIVE;
  let current = TIERS[0].tier;
  for (const t of TIERS) if (solde >= t.min) current = t.tier;
  return current;
}

export type Periode = "jour" | "semaine" | "mois" | "trimestre" | "semestre" | "annee" | "tout";

export function periodeStart(p: Periode): Date | null {
  if (p === "tout") return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "jour") return d;
  if (p === "semaine") {
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    return d;
  }
  if (p === "mois") return new Date(d.getFullYear(), d.getMonth(), 1);
  if (p === "trimestre") {
    const q = Math.floor(d.getMonth() / 3) * 3;
    return new Date(d.getFullYear(), q, 1);
  }
  if (p === "semestre") {
    const s = d.getMonth() < 6 ? 0 : 6;
    return new Date(d.getFullYear(), s, 1);
  }
  if (p === "annee") return new Date(d.getFullYear(), 0, 1);
  return d;
}

export const PERIODE_LABEL: Record<Periode, string> = {
  jour: "Jour",
  semaine: "Semaine",
  mois: "Mois",
  trimestre: "Trimestre",
  semestre: "Semestre",
  annee: "Année",
  tout: "Tout",
};