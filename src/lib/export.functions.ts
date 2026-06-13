import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const exportSchema = z.object({
  startIso: z.string().datetime().nullable(),
  typeFilter: z.enum(["all", "entree", "sortie"]).default("all"),
  query: z.string().trim().max(80).default(""),
});

type ExportOperation = {
  type: "entree" | "sortie";
  montant: number;
  description: string;
  categorie: string;
  mode_paiement: string;
  date_operation: string;
  note: string | null;
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export const exportHistoryCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => exportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      throw new Error("Export réservé à l'admin.");
    }

    let request = context.supabase
      .from("operations")
      .select("type, montant, description, categorie, mode_paiement, date_operation, note")
      .order("date_operation", { ascending: false })
      .limit(5000);

    if (data.startIso) request = request.gte("date_operation", data.startIso);
    if (data.typeFilter !== "all") request = request.eq("type", data.typeFilter);

    const { data: rows, error } = await request;
    if (error) throw new Error("Export impossible pour le moment.");

    const needle = data.query.toLowerCase();
    const filtered = ((rows ?? []) as ExportOperation[]).filter((op) => {
      if (!needle) return true;
      return [op.description, op.categorie, op.mode_paiement].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });

    const header = ["Date", "Type", "Montant (FCFA)", "Description", "Catégorie", "Mode", "Note"];
    const body = filtered.map((op) => [
      new Date(op.date_operation).toLocaleString("fr-FR"),
      op.type,
      Number(op.montant),
      op.description,
      op.categorie,
      op.mode_paiement,
      op.note,
    ]);

    // Journalise l'export (audit côté serveur)
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("phone")
      .eq("id", context.userId)
      .maybeSingle();
    await (context.supabase as unknown as {
      from: (t: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: unknown }> };
    })
      .from("export_audit_logs")
      .insert({
        admin_user_id: context.userId,
        admin_phone: profile?.phone ?? null,
        periode_start: data.startIso,
        type_filter: data.typeFilter,
        query_text: data.query || null,
        rows_count: body.length,
      });

    return {
      filename: `maestrabook-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n"),
      count: body.length,
    };
  });

function esc(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function fmtMoney(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}
function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export const exportHistoryReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => exportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!adminRole) throw new Error("Rapport reserve a l'admin.");

    let request = context.supabase
      .from("operations")
      .select("type, montant, description, categorie, mode_paiement, date_operation, note")
      .order("date_operation", { ascending: false })
      .limit(10000);
    if (data.startIso) request = request.gte("date_operation", data.startIso);
    if (data.typeFilter !== "all") request = request.eq("type", data.typeFilter);
    const { data: rows, error } = await request;
    if (error) throw new Error("Rapport indisponible.");

    const needle = data.query.toLowerCase();
    const ops = ((rows ?? []) as ExportOperation[]).filter((op) =>
      !needle || [op.description, op.categorie, op.mode_paiement].some((v) => v.toLowerCase().includes(needle))
    );

    const { data: profile } = await context.supabase
      .from("profiles").select("phone, full_name").eq("id", context.userId).maybeSingle();
    await (context.supabase as unknown as {
      from: (t: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: unknown }> };
    }).from("export_audit_logs").insert({
      admin_user_id: context.userId,
      admin_phone: (profile as { phone?: string } | null)?.phone ?? null,
      periode_start: data.startIso,
      type_filter: data.typeFilter,
      query_text: data.query || null,
      rows_count: ops.length,
    });

    // Groupement par mois
    const groups = new Map<string, ExportOperation[]>();
    for (const op of ops) {
      const k = monthKey(op.date_operation);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(op);
    }
    const monthsSorted = [...groups.keys()].sort().reverse();

    const totEntree = ops.filter((o) => o.type === "entree").reduce((s, o) => s + Number(o.montant), 0);
    const totSortie = ops.filter((o) => o.type === "sortie").reduce((s, o) => s + Number(o.montant), 0);
    const benefice = totEntree - totSortie;
    const periodeLabel = data.startIso
      ? `Depuis le ${new Date(data.startIso).toLocaleDateString("fr-FR")}`
      : "Periode complete";
    const now = new Date();
    const exportStamp = now.toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const adminName = (profile as { full_name?: string; phone?: string } | null)?.full_name
      || (profile as { phone?: string } | null)?.phone || "Administrateur";

    const monthSections = monthsSorted.map((k) => {
      const list = groups.get(k)!;
      const inSum = list.filter((o) => o.type === "entree").reduce((s, o) => s + Number(o.montant), 0);
      const outSum = list.filter((o) => o.type === "sortie").reduce((s, o) => s + Number(o.montant), 0);
      const rowsHtml = list.map((op) => {
        const d = new Date(op.date_operation);
        const isIn = op.type === "entree";
        return `<tr>
          <td>${esc(d.toLocaleDateString("fr-FR"))}<br/><span class="t">${esc(d.toLocaleTimeString("fr-FR"))}</span></td>
          <td><span class="pill ${isIn ? "in" : "out"}">${isIn ? "Entree" : "Sortie"}</span></td>
          <td>${esc(op.description)}<br/><span class="t">${esc(op.note ?? "")}</span></td>
          <td>${esc(op.categorie)}</td>
          <td>${esc(op.mode_paiement)}</td>
          <td class="num ${isIn ? "g" : "r"}">${isIn ? "+" : "-"} ${esc(fmtMoney(Number(op.montant)))}</td>
        </tr>`;
      }).join("");
      return `
      <section class="month">
        <header class="mh">
          <h2>${esc(monthLabel(k))}</h2>
          <div class="kpi">
            <div><span>Entrees</span><b class="g">${esc(fmtMoney(inSum))}</b></div>
            <div><span>Sorties</span><b class="r">${esc(fmtMoney(outSum))}</b></div>
            <div><span>Benefice</span><b class="${inSum - outSum >= 0 ? "g" : "r"}">${esc(fmtMoney(inSum - outSum))}</b></div>
          </div>
        </header>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Libelle</th><th>Categorie</th><th>Paiement</th><th class="num">Montant</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </section>`;
    }).join("");

    const totalGlobal = `
      <section class="total-global">
        <h2>Total global de la periode</h2>
        <table class="tg">
          <tr><td>Operations</td><td class="num">${ops.length}</td></tr>
          <tr><td>Total entrees</td><td class="num g">${esc(fmtMoney(totEntree))}</td></tr>
          <tr><td>Total sorties</td><td class="num r">${esc(fmtMoney(totSortie))}</td></tr>
          <tr class="bal"><td>Benefice net</td><td class="num ${benefice >= 0 ? "g" : "r"}">${esc(fmtMoney(benefice))}</td></tr>
        </table>
      </section>`;

    const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/>
<title>Rapport financier MaestraBook</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;background:#f5f3ef;margin:0;padding:32px}
  .page{max-width:900px;margin:0 auto;background:#fff;padding:48px;box-shadow:0 4px 24px rgba(0,0,0,.06);border-radius:8px}
  .cover{border-bottom:3px solid #6b1e3a;padding-bottom:24px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
  .brand h1{font-size:28px;color:#6b1e3a;margin:0 0 4px;letter-spacing:.5px}
  .brand p{margin:0;color:#6b6b6b;font-size:13px}
  .meta{text-align:right;font-size:12px;color:#444;line-height:1.6}
  .meta b{color:#6b1e3a}
  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:40px}
  .card{padding:20px;border-radius:10px;background:linear-gradient(135deg,#fdf8f3,#f5ebe0);border:1px solid #e8d9c5}
  .card span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8b6f47;font-weight:600}
  .card b{display:block;font-size:22px;font-weight:700;margin-top:8px}
  .card.in b{color:#15803d}
  .card.out b{color:#b91c1c}
  .card.bal b{color:#6b1e3a}
  .month{margin-bottom:36px;page-break-inside:avoid}
  .mh{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #d4a373;padding-bottom:8px;margin-bottom:12px}
  .mh h2{font-size:18px;margin:0;color:#6b1e3a;text-transform:capitalize}
  .kpi{display:flex;gap:18px;font-size:12px}
  .kpi div{text-align:right}
  .kpi span{display:block;color:#666;text-transform:uppercase;font-size:10px;letter-spacing:.5px}
  .kpi b{font-size:14px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;padding:8px 6px;background:#f5ebe0;color:#6b1e3a;font-weight:600;border-bottom:1px solid #d4a373}
  td{padding:8px 6px;border-bottom:1px solid #eee;vertical-align:top}
  td .t{color:#888;font-size:10px}
  .num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
  .g{color:#15803d}.r{color:#b91c1c}
  .pill{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;text-transform:uppercase}
  .pill.in{background:#dcfce7;color:#15803d}
  .pill.out{background:#fee2e2;color:#b91c1c}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:11px;color:#666;text-align:center}
  @media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0;padding:24px}}
  @page{margin:14mm}
</style></head>
<body>
<div class="page">
  <div class="cover">
    <div class="brand">
      <h1>MaestraBook</h1>
      <p>Rapport financier officiel</p>
    </div>
    <div class="meta">
      <div><b>Periode :</b> ${esc(periodeLabel)}</div>
      <div><b>Genere le :</b> ${esc(exportStamp)}</div>
      <div><b>Par :</b> ${esc(adminName)}</div>
      <div><b>Operations :</b> ${ops.length}</div>
    </div>
  </div>

  <div class="summary">
    <div class="card in"><span>Total entrees</span><b>${esc(fmtMoney(totEntree))}</b></div>
    <div class="card out"><span>Total sorties</span><b>${esc(fmtMoney(totSortie))}</b></div>
    <div class="card bal"><span>Benefice net</span><b>${esc(fmtMoney(benefice))}</b></div>
  </div>

  ${ops.length === 0
    ? `<p style="text-align:center;padding:40px;color:#666">Aucune operation pour cette periode.</p>`
    : monthSections + totalGlobal}

  <div class="footer">
    Document genere par MaestraBook &middot; ${esc(exportStamp)} &middot; Utilisable comme piece justificative
    pour banques et structures de financement.
  </div>
</div>
<script>setTimeout(function(){window.print()},400)</script>
</body></html>`;

    return {
      filename: `rapport-maestrabook-${now.toISOString().slice(0, 10)}.html`,
      html,
      count: ops.length,
      totals: { entree: totEntree, sortie: totSortie, benefice },
    };
  });