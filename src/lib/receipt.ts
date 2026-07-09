// Génération de reçu PDF via impression navigateur — 100% client, aucun paywall.
// Utilisable pour chaque opération de l'historique.

function esc(v: string | number | null | undefined): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}

export type ReceiptOperation = {
  id: string;
  type: "entree" | "sortie";
  montant: number;
  description: string;
  categorie: string;
  mode_paiement: string;
  date_operation: string;
  note?: string | null;
  quantite?: number | null;
  activityName?: string | null;
  operatorName?: string | null;
};

export function openReceipt(op: ReceiptOperation) {
  const d = new Date(op.date_operation);
  const isIn = op.type === "entree";
  const label = isIn ? "Reçu de vente" : "Reçu de dépense";
  const color = isIn ? "#15803d" : "#b91c1c";
  const numero = `MG-${op.id.slice(0, 8).toUpperCase()}`;
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><title>${esc(label)} ${numero}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#172554;background:#f4f8ff;margin:0;padding:24px}
  .r{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden}
  .hd{padding:20px 24px;background:linear-gradient(135deg,#003eab,#0053d6);color:#fff}
  .hd h1{margin:0;font-size:20px;letter-spacing:.5px}
  .hd p{margin:4px 0 0;font-size:12px;opacity:.85}
  .body{padding:24px}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #e5e7eb;font-size:13px}
  .row b{color:#0f172a}
  .total{margin-top:16px;padding:14px 16px;border-radius:10px;background:#eef6ff;display:flex;justify-content:space-between;align-items:center}
  .total span{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#1d4ed8;font-weight:600}
  .total b{font-size:22px;color:${color}}
  .ft{padding:16px 24px;font-size:11px;color:#64748b;text-align:center;background:#f8fafc}
  .pill{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${isIn ? "#dcfce7" : "#fee2e2"};color:${color}}
  @media print{body{background:#fff;padding:0}.r{box-shadow:none;border-radius:0}}
  @page{margin:10mm}
</style></head>
<body>
  <div class="r">
    <div class="hd">
      <h1>${esc(op.activityName || "MiProjet Go")}</h1>
      <p>${esc(label)} · N° ${esc(numero)}</p>
    </div>
    <div class="body">
      <div class="row"><span>Date</span><b>${esc(d.toLocaleString("fr-FR"))}</b></div>
      <div class="row"><span>Type</span><span class="pill">${isIn ? "Entrée" : "Sortie"}</span></div>
      <div class="row"><span>Libellé</span><b>${esc(op.description)}</b></div>
      ${op.quantite ? `<div class="row"><span>Quantité</span><b>${esc(op.quantite)}</b></div>` : ""}
      <div class="row"><span>Catégorie</span><b>${esc(op.categorie)}</b></div>
      <div class="row"><span>Mode de paiement</span><b>${esc(op.mode_paiement)}</b></div>
      ${op.note ? `<div class="row"><span>Note</span><b>${esc(op.note)}</b></div>` : ""}
      ${op.operatorName ? `<div class="row"><span>Opérateur</span><b>${esc(op.operatorName)}</b></div>` : ""}
      <div class="total"><span>Montant</span><b>${isIn ? "+ " : "- "}${esc(fmt(Number(op.montant)))}</b></div>
    </div>
    <div class="ft">Document généré par MiProjet Go — ${esc(new Date().toLocaleString("fr-FR"))}</div>
  </div>
  <script>setTimeout(function(){window.print()},400)</script>
</body></html>`;
  const w = window.open("", "_blank", "width=640,height=800");
  if (!w) {
    // Fallback : téléchargement direct
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recu-${numero}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}