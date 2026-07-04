import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudUpload, ListChecks, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import {
  flushQueue,
  getQueue,
  getSyncLog,
  subscribeQueue,
  subscribeSyncLog,
  type QueuedOperation,
  type SyncLogEntry,
} from "@/lib/offline-queue";

export const Route = createFileRoute("/_authenticated/synchronisation")({
  head: () => ({ meta: [{ title: "Synchronisation — MiProjet Go" }] }),
  component: SyncLogPage,
});

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function SyncLogPage() {
  const [queue, setQueue] = useState<QueuedOperation[]>(() => getQueue());
  const [log, setLog] = useState<SyncLogEntry[]>(() => getSyncLog());
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setQueue(getQueue());
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    };
    const unsubQueue = subscribeQueue(refresh);
    const unsubLog = subscribeSyncLog(() => setLog(getSyncLog()));
    return () => { unsubQueue(); unsubLog(); };
  }, []);

  async function retryBatch() {
    if (!online) return toast.error("Pas de réseau pour synchroniser");
    if (queue.length === 0) return toast.success("File vide");
    setSyncing(true);
    const result = await flushQueue();
    setQueue(getQueue());
    setLog(getSyncLog());
    setSyncing(false);
    if (result.failed > 0) toast.error(`${result.failed} échec(s), consulte le journal`);
    else toast.success(`${result.ok} opération(s) synchronisée(s)`);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
          <ListChecks className="w-6 h-6" /> Journal de synchronisation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Tentatives, succès, échecs et erreurs backend.</p>
      </header>

      <section className="grid grid-cols-3 gap-2 text-center">
        <Stat label="En attente" value={String(queue.length)} />
        <Stat label="Succès" value={String(log.filter((entry) => entry.status === "success").length)} />
        <Stat label="Échecs" value={String(log.filter((entry) => entry.status === "error").length)} />
      </section>

      <button
        onClick={retryBatch}
        disabled={!online || syncing || queue.length === 0}
        className="w-full h-12 rounded-xl text-primary-foreground font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: "var(--gradient-primary)" }}
      >
        <RefreshCcw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
        {online ? "Réessayer le lot" : "Hors ligne"}
      </button>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-primary flex items-center gap-2">
          <CloudUpload className="w-5 h-5" /> File d'attente
        </h2>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-card rounded-2xl p-4 border border-border text-center">Aucune opération en attente.</p>
        ) : queue.map((item) => <QueueRow key={item.id} item={item} />)}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-primary">Tentatives</h2>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-card rounded-2xl p-4 border border-border text-center">Aucun événement de synchronisation.</p>
        ) : log.map((entry) => <LogRow key={entry.id} entry={entry} />)}
      </section>
    </div>
  );
}

function QueueRow({ item }: { item: QueuedOperation }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-semibold truncate">{item.description}</span>
        <span className={`font-semibold tabular-nums ${item.type === "entree" ? "text-[var(--success)]" : "text-destructive"}`}>
          {item.type === "entree" ? "+" : "−"} {fmt(item.montant)}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">Ajoutée {new Date(item.queued_at).toLocaleString("fr-FR")}</div>
    </div>
  );
}

function LogRow({ entry }: { entry: SyncLogEntry }) {
  const success = entry.status === "success";
  return (
    <div className="bg-card border border-border rounded-2xl p-3" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start gap-3">
        {success ? <CheckCircle2 className="w-5 h-5 text-[var(--success)] mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm truncate">{entry.description}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{fmt(entry.montant)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 break-words">{entry.message}</p>
          <div className="text-[11px] text-muted-foreground mt-1">{new Date(entry.timestamp).toLocaleString("fr-FR")}</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl py-3 px-2" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="font-display text-xl font-bold text-primary tabular-nums">{value}</div>
    </div>
  );
}