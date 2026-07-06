import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getExportEntitlement, redeemExportCode } from "@/lib/redeem-export.functions";

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

const QK = ["export-entitlement"] as const;

export function useExportUnlocked(): boolean {
  const fetchEntitlement = useServerFn(getExportEntitlement);
  const { data } = useQuery({
    queryKey: QK,
    queryFn: () => fetchEntitlement(),
    staleTime: 60_000,
  });
  return !!data?.unlocked;
}

export function useUnlockExports() {
  const qc = useQueryClient();
  const redeem = useServerFn(redeemExportCode);
  return async (code: string): Promise<boolean> => {
    try {
      const res = await redeem({ data: { code } });
      if (!res?.ok) return false;
      await qc.invalidateQueries({ queryKey: QK });
      return true;
    } catch {
      return false;
    }
  };
}