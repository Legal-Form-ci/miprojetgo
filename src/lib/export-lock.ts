import { useSyncExternalStore } from "react";

const KEY = "mpg_export_unlock_code";
// Codes forfaitaires distribués par MiProjet (UI only, DB à venir)
const VALID_CODES = new Set([
  "MPG-MENSUEL",
  "MPG-TRIMESTRE",
  "MPG-ANNUEL",
  "MPG-DEMO",
]);

export type ExportPlan = {
  id: string;
  label: string;
  price: string;
  period: string;
  perks: string[];
  highlight?: boolean;
};

export const EXPORT_PLANS: ExportPlan[] = [
  {
    id: "mensuel",
    label: "Mensuel",
    price: "2 000 FCFA",
    period: "par mois",
    perks: ["Impression illimitée", "Téléchargement PDF / Excel / CSV", "Partage direct"],
  },
  {
    id: "trimestre",
    label: "Trimestre",
    price: "5 000 FCFA",
    period: "pour 3 mois",
    perks: ["Tous les avantages mensuels", "Économie ≈ 17 %", "Logo activité sur les rapports"],
    highlight: true,
  },
  {
    id: "annuel",
    label: "Annuel",
    price: "18 000 FCFA",
    period: "par an",
    perks: ["Tous les avantages", "Économie ≈ 25 %", "Priorité support MiProjet"],
  },
];

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

function read(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function isExportUnlocked(): boolean {
  return !!read();
}

export function unlockExports(code: string): boolean {
  const trimmed = code.trim().toUpperCase();
  if (!VALID_CODES.has(trimmed)) return false;
  try {
    window.localStorage.setItem(KEY, trimmed);
  } catch {
    return false;
  }
  notify();
  return true;
}

export function lockExports() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  notify();
}

export function useExportUnlocked(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) cb();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    () => (read() ? "1" : "0"),
    () => "0",
  ) === "1";
}