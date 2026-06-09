// Tiny offline queue for operations. When offline, an insert is buffered
// in localStorage and flushed when the network returns.

import { supabase } from "@/integrations/supabase/client";

const KEY = "maestrabook.offline-queue.v1";
const PROGRESS_EVT = "maestra-queue-progress";

export type QueuedOperation = {
  id: string;
  user_id: string;
  type: "entree" | "sortie";
  montant: number;
  description: string;
  categorie: string;
  mode_paiement: string;
  note: string | null;
  date_operation: string;
  source: "manuel" | "import_ia";
  queued_at: string;
};

function read(): QueuedOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedOperation[]) : [];
  } catch {
    return [];
  }
}

function write(list: QueuedOperation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("maestra-queue-change"));
}

export function getQueue(): QueuedOperation[] {
  return read();
}

export function enqueueOperation(op: Omit<QueuedOperation, "id" | "queued_at">) {
  const list = read();
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  list.push({ ...op, id, queued_at: new Date().toISOString() });
  write(list);
}

export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  const list = read();
  if (list.length === 0) return { ok: 0, failed: 0 };
  let ok = 0;
  const remaining: QueuedOperation[] = [];
  const total = list.length;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const { id: _id, queued_at: _q, ...payload } = item;
    const { error } = await supabase.from("operations").insert(payload);
    if (error) remaining.push(item);
    else ok++;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(PROGRESS_EVT, { detail: { done: i + 1, total, ok, failed: remaining.length } }),
      );
    }
  }
  write(remaining);
  return { ok, failed: remaining.length };
}

export function subscribeProgress(cb: (d: { done: number; total: number; ok: number; failed: number }) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = (e: Event) => cb((e as CustomEvent).detail);
  window.addEventListener(PROGRESS_EVT, h);
  return () => window.removeEventListener(PROGRESS_EVT, h);
}

export function subscribeQueue(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("maestra-queue-change", handler);
  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);
  return () => {
    window.removeEventListener("maestra-queue-change", handler);
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
  };
}