import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Wallet, User } from "lucide-react";
import { getTier, periodeStart, PERIODE_LABEL, type Periode } from "@/lib/tier";
import { avatarSignedUrl } from "@/lib/avatar";

type Op = { type: "entree" | "sortie"; montant: number; date_operation: string };

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}

function maskNumber(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "");
  const last4 = digits.slice(-4).padStart(4, "•");
  return `•••• •••• •••• ${last4}`;
}

export function BalanceCard({
  ops,
  isAdmin,
  fullName,
  phone,
  avatarPath,
}: {
  ops: Op[];
  isAdmin: boolean;
  fullName: string | null;
  phone: string | null;
  avatarPath?: string | null;
}) {
  const [periode, setPeriode] = useState<Periode>("jour");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    avatarSignedUrl(avatarPath).then((url) => {
      if (alive) setAvatarUrl(url);
    });
    return () => {
      alive = false;
    };
  }, [avatarPath]);

  const totEntree = ops.filter((o) => o.type === "entree").reduce((s, o) => s + Number(o.montant), 0);
  const totSortie = ops.filter((o) => o.type === "sortie").reduce((s, o) => s + Number(o.montant), 0);
  const solde = totEntree - totSortie;
  const tier = getTier(solde);

  const start = periodeStart(periode);
  const inRange = (o: Op) => (start ? new Date(o.date_operation) >= start : true);
  const entreePeriode = ops.filter((o) => o.type === "entree" && inRange(o)).reduce((s, o) => s + Number(o.montant), 0);
  const sortiePeriode = ops.filter((o) => o.type === "sortie" && inRange(o)).reduce((s, o) => s + Number(o.montant), 0);

  const displayName = (fullName?.trim() || "Utilisateur MiProjet").toUpperCase();

  return (
    <section className="space-y-3">
      <div
        className="relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6"
        style={{
          background: tier.gradient,
          boxShadow: tier.shadow,
          color: tier.textColor,
          aspectRatio: "1.586 / 1",
          maxWidth: "100%",
        }}
      >
        {/* shimmer */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5) 0%, transparent 35%), radial-gradient(circle at 85% 80%, rgba(0,0,0,0.25) 0%, transparent 40%)",
          }}
        />
        {/* chip */}
        <div
          className="absolute top-4 right-4 sm:top-5 sm:right-6 h-7 w-9 sm:h-8 sm:w-11 rounded-md"
          style={{
            background: "linear-gradient(135deg, #d4af37 0%, #f5d06f 50%, #a87b1b 100%)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)",
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-semibold opacity-80">
            <Wallet className="w-3.5 h-3.5" />
            {isAdmin ? "Solde global" : "Solde personnel"}
          </div>
        </div>

        <div className="relative mt-3 sm:mt-4">
          <div className="font-display text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
            {fmt(solde)}
          </div>
          <div className="text-[10px] sm:text-xs uppercase tracking-widest mt-1 opacity-80 font-semibold">
            {tier.label}
          </div>
        </div>

        <div className="relative mt-4 sm:mt-5 font-mono text-[13px] sm:text-base tracking-[0.18em] opacity-90">
          {maskNumber(phone)}
        </div>

        <div className="relative mt-3 sm:mt-4 flex items-end justify-between gap-3 min-w-0">
          <div className="min-w-0 flex items-center gap-2.5">
            <span
              className="relative shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: tier.accent }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 opacity-70" />
              )}
            </span>
            <div className="min-w-0">
              <div className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-75 leading-tight">
                Titulaire
              </div>
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider truncate">
                {displayName}
              </div>
            </div>
          </div>
          <div
            className="shrink-0 italic font-display font-bold text-base sm:text-lg leading-none"
            style={{ letterSpacing: "0.02em" }}
          >
            MiProjet Go
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(PERIODE_LABEL) as Periode[]).map((p) => {
          const active = p === periode;
          return (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {PERIODE_LABEL[p]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-3 text-white"
          style={{
            background: "linear-gradient(135deg, #047857, #10b981)",
            boxShadow: "0 12px 28px -14px rgba(16,185,129,0.55)",
          }}
        >
          <div className="text-[10px] uppercase tracking-wide opacity-90 flex items-center gap-1 font-semibold">
            <ArrowUpCircle className="w-3.5 h-3.5" /> Entrées ({PERIODE_LABEL[periode].toLowerCase()})
          </div>
          <div className="font-display font-bold text-lg mt-1 tabular-nums">{fmt(entreePeriode)}</div>
        </div>
        <div
          className="rounded-2xl p-3 text-white"
          style={{
            background: "linear-gradient(135deg, #991b1b, #ef4444)",
            boxShadow: "0 12px 28px -14px rgba(239,68,68,0.55)",
          }}
        >
          <div className="text-[10px] uppercase tracking-wide opacity-90 flex items-center gap-1 font-semibold">
            <ArrowDownCircle className="w-3.5 h-3.5" /> Sorties ({PERIODE_LABEL[periode].toLowerCase()})
          </div>
          <div className="font-display font-bold text-lg mt-1 tabular-nums">{fmt(sortiePeriode)}</div>
        </div>
      </div>
    </section>
  );
}