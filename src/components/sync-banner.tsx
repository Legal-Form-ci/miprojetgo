import { useEffect, useState } from "react";
import { CloudOff, CloudUpload, CheckCircle2, RefreshCcw, AlertTriangle, X, ListChecks } from "lucide-react";
import {
  flushQueue,
  getQueue,
  getSyncLog,
  subscribeQueue,
  subscribeProgress,
  subscribeSyncLog,
  type QueuedOperation,
  type SyncLogEntry,
} from "@/lib/offline-queue";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Status = "idle" | "syncing" | "success" | "error";

export function SyncBanner() {
  const qc = useQueryClient();
  const [queue, setQueue] = useState<QueuedOperation[]>(() => getQueue());
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<SyncLogEntry[]>(() => getSyncLog());

  useEffect(() => {
    const refresh = () => {
      setQueue(getQueue());
      if (typeof navigator !== "undefined") setOnline(navigator.onLine);
    };
    const unsub = subscribeQueue(refresh);
    const unsubP = subscribeProgress((d) => setProgress({ done: d.done, total: d.total }));
    const unsubLog = subscribeSyncLog(() => setLog(getSyncLog()));
    return () => { unsub(); unsubP(); unsubLog(); };
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (online && queue.length > 0 && status !== "syncing") {
      void sync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  async function sync() {
    if (queue.length === 0) return;
    setStatus("syncing");
    setProgress({ done: 0, total: queue.length });
    const res = await flushQueue();
    setProgress(null);
    setQueue(getQueue());
    setLog(getSyncLog());
    if (res.failed === 0) {
      setStatus("success");
      toast.success(`${res.ok} opération${res.ok > 1 ? "s" : ""} synchronisée${res.ok > 1 ? "s" : ""}`);
      qc.invalidateQueries({ queryKey: ["dashboard-ops"] });
      qc.invalidateQueries({ queryKey: ["history-ops"] });
      setTimeout(() => setStatus("idle"), 2500);
    } else {
      setStatus("error");
      toast.error(`${res.failed} échec(s) — réessaie`);
    }
  }

  const hasQueue = queue.length > 0;
  if (!hasQueue && online && status !== "success") return null;

  let bg = "bg-muted/80";
  let icon = <CheckCircle2 className="w-4 h-4" />;
  let label = "Synchronisé";
  if (!online) { bg = "bg-amber-100 text-amber-900"; icon = <CloudOff className="w-4 h-4" />; label = `Hors ligne · ${queue.length} en attente`; }
  else if (status === "syncing") { bg = "bg-blue-100 text-blue-900"; icon = <CloudUpload className="w-4 h-4 animate-pulse" />; label = `Synchronisation… ${progress ? `${progress.done}/${progress.total}` : ""}`; }
  else if (status === "error") { bg = "bg-red-100 text-red-900"; icon = <AlertTriangle className="w-4 h-4" />; label = `${queue.length} non synchronisée${queue.length > 1 ? "s" : ""}`; }
  else if (hasQueue) { bg = "bg-amber-100 text-amber-900"; icon = <CloudUpload className="w-4 h-4" />; label = `${queue.length} à synchroniser`; }
  else if (status === "success") { bg = "bg-emerald-100 text-emerald-900"; label = "Tout est à jour"; }

  return (
    <>
      <div className={`sticky top-14 z-20 ${bg} text-xs font-semibold`}>
        <div className="max-w-2xl mx-auto px-4 h-9 flex items-center justify-between gap-2">
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 flex-1 min-w-0">
            {icon}<span className="truncate">{label}</span>
          </button>
          {hasQueue && online && status !== "syncing" && (
            <button
              onClick={sync}
              className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-white/70 hover:bg-white text-[11px] uppercase tracking-wide"
            >
              <RefreshCcw className="w-3 h-3" /> Sync
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-primary">Journal de synchronisation</h3>
                <p className="text-xs text-muted-foreground">{queue.length} en file · {log.length} tentative(s)</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <CloudUpload className="w-4 h-4" /> File d'attente
              </div>
              {queue.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-xl border border-border p-4 text-center">File vide — tout est synchronisé.</p>
              ) : queue.map((q) => (
                <div key={q.id} className="border border-border rounded-xl p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">{q.description}</span>
                    <span className={`tabular-nums font-semibold ${q.type === "entree" ? "text-emerald-600" : "text-destructive"}`}>
                      {q.type === "entree" ? "+" : "−"} {new Intl.NumberFormat("fr-FR").format(q.montant)}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {q.categorie} · {q.mode_paiement} · ajoutée {new Date(q.queued_at).toLocaleString("fr-FR")}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground pt-3">
                <ListChecks className="w-4 h-4" /> Tentatives
              </div>
              {log.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-xl border border-border p-4 text-center">Aucune tentative enregistrée.</p>
              ) : log.map((entry) => (
                <div key={entry.id} className="border border-border rounded-xl p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{entry.description}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(entry.timestamp).toLocaleString("fr-FR")}</div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${entry.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {entry.status === "success" ? "Succès" : "Échec"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 break-words">{entry.message}</p>
                </div>
              ))}
            </div>
            {queue.length > 0 && (
              <div className="p-4 border-t border-border">
                <button
                  disabled={!online || status === "syncing"}
                  onClick={sync}
                  className="w-full h-12 rounded-xl text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <RefreshCcw className={`w-4 h-4 ${status === "syncing" ? "animate-spin" : ""}`} />
                  {online ? (status === "syncing" ? "En cours…" : "Synchroniser maintenant") : "Hors ligne — pas de réseau"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
