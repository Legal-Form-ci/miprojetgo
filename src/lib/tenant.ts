import { useSyncExternalStore } from "react";

export type TenantKind =
  | "maquis"
  | "boutique"
  | "cave"
  | "restaurant"
  | "salon"
  | "atelier"
  | "garage"
  | "kiosque"
  | "momo"
  | "autre";

export type Tenant = {
  id: string;
  nom: string;
  kind: TenantKind;
  emoji: string;
};

export const TENANT_KINDS: Array<{ kind: TenantKind; label: string; emoji: string }> = [
  { kind: "maquis", label: "Maquis", emoji: "🍢" },
  { kind: "boutique", label: "Boutique", emoji: "🛍️" },
  { kind: "cave", label: "Cave", emoji: "🍺" },
  { kind: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { kind: "salon", label: "Salon de coiffure", emoji: "💇🏾" },
  { kind: "atelier", label: "Atelier / Couture", emoji: "🧵" },
  { kind: "garage", label: "Garage / Mécanique", emoji: "🔧" },
  { kind: "kiosque", label: "Kiosque", emoji: "🏪" },
  { kind: "momo", label: "Mobile Money", emoji: "📱" },
  { kind: "autre", label: "Autre activité", emoji: "💼" },
];

const STORE_KEY = "mpg.tenants.v1";
const ACTIVE_KEY = "mpg.tenant.active.v1";

type TenantState = {
  tenants: Tenant[];
  activeId: string | null;
};

const defaultTenant: Tenant = {
  id: "default",
  nom: "Mon activité",
  kind: "autre",
  emoji: "💼",
};

function read(): TenantState {
  if (typeof window === "undefined") return { tenants: [defaultTenant], activeId: "default" };
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const tenants: Tenant[] = raw ? JSON.parse(raw) : [defaultTenant];
    const activeId = window.localStorage.getItem(ACTIVE_KEY) || tenants[0]?.id || null;
    return { tenants: tenants.length ? tenants : [defaultTenant], activeId };
  } catch {
    return { tenants: [defaultTenant], activeId: "default" };
  }
}

function write(state: TenantState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(state.tenants));
  if (state.activeId) window.localStorage.setItem(ACTIVE_KEY, state.activeId);
  window.dispatchEvent(new CustomEvent("mpg:tenant-change"));
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onEvt = () => cb();
  if (typeof window !== "undefined") window.addEventListener("mpg:tenant-change", onEvt);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("mpg:tenant-change", onEvt);
  };
}
function getSnapshot(): TenantState {
  return read();
}
function getServerSnapshot(): TenantState {
  return { tenants: [defaultTenant], activeId: "default" };
}

export function useTenants() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const active = state.tenants.find((t) => t.id === state.activeId) ?? state.tenants[0] ?? defaultTenant;

  return {
    tenants: state.tenants,
    active,
    setActive(id: string) {
      write({ ...read(), activeId: id });
    },
    add(t: Omit<Tenant, "id">) {
      const cur = read();
      const id = crypto.randomUUID();
      const next: Tenant = { id, ...t };
      write({ tenants: [...cur.tenants, next], activeId: id });
      return next;
    },
    remove(id: string) {
      const cur = read();
      const tenants = cur.tenants.filter((t) => t.id !== id);
      const finalTenants = tenants.length ? tenants : [defaultTenant];
      const activeId = cur.activeId === id ? finalTenants[0].id : cur.activeId;
      write({ tenants: finalTenants, activeId });
    },
    rename(id: string, nom: string) {
      const cur = read();
      write({
        ...cur,
        tenants: cur.tenants.map((t) => (t.id === id ? { ...t, nom } : t)),
      });
    },
  };
}
