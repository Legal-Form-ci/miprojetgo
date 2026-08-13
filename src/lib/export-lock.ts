import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getExportEntitlement, startWaveCheckout, syncWavePayment } from "@/lib/payments.functions";

export type ExportPlan = {
  id: "mensuel" | "trimestre" | "annuel";
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

export function useExportEntitlement() {
  const fetchEntitlement = useServerFn(getExportEntitlement);
  return useQuery({ queryKey: QK, queryFn: () => fetchEntitlement(), staleTime: 60_000 });
}

/** Lance un paiement Wave réel et renvoie l'URL de règlement. */
export function usePayWithWave() {
  const start = useServerFn(startWaveCheckout);
  return async (plan: ExportPlan["id"]) => {
    const res = await start({ data: { plan } });
    try {
      localStorage.setItem("mpg.wave.pending", res.reference);
    } catch {
      /* noop */
    }
    return res;
  };
}

/** Vérifie auprès de Wave un paiement en attente (retour de checkout). */
export function useCheckWavePayment() {
  const qc = useQueryClient();
  const sync = useServerFn(syncWavePayment);
  return async (reference: string) => {
    const res = await sync({ data: { reference } });
    await qc.invalidateQueries({ queryKey: QK });
    return res;
  };
}