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
  | "bistro"
  | "bar"
  | "supermarche"
  | "epicerie"
  | "patisserie"
  | "boulangerie"
  | "fastfood"
  | "cybercafe"
  | "photocopie"
  | "couture"
  | "cordonnerie"
  | "menuiserie"
  | "soudure"
  | "plomberie"
  | "electricite"
  | "peinture"
  | "construction"
  | "briqueterie"
  | "quincaillerie"
  | "pharmacie"
  | "clinique"
  | "cabinet"
  | "ecole"
  | "creche"
  | "librairie"
  | "papeterie"
  | "informatique"
  | "reparation_telephone"
  | "vente_telephone"
  | "friperie"
  | "pretaporter"
  | "cosmetique"
  | "parfumerie"
  | "bijouterie"
  | "photographie"
  | "eventiel"
  | "location_salle"
  | "location_voiture"
  | "transport"
  | "taxi"
  | "gbaka"
  | "moto_taxi"
  | "livraison"
  | "agriculture"
  | "elevage"
  | "peche"
  | "aviculture"
  | "porcherie"
  | "boucherie"
  | "poissonnerie"
  | "primeur"
  | "marche"
  | "grossiste"
  | "demi_grossiste"
  | "importexport"
  | "logistique"
  | "carwash"
  | "station_service"
  | "hotel"
  | "auberge"
  | "chambres"
  | "location_maison"
  | "immobilier"
  | "notaire"
  | "avocat"
  | "comptable"
  | "consulting"
  | "marketing"
  | "creation_web"
  | "influence"
  | "musique"
  | "artisanat"
  | "sculpture"
  | "poterie"
  | "vannerie"
  | "tisserand"
  | "teinture"
  | "tresses"
  | "manucure"
  | "spa"
  | "sport"
  | "gym"
  | "ecole_sport"
  | "ong"
  | "association"
  | "eglise"
  | "cooperative"
  | "tontine"
  | "autre";

export type Tenant = {
  id: string;
  nom: string;
  kind: TenantKind;
  emoji: string;
};

export const TENANT_KINDS: Array<{ kind: TenantKind; label: string; emoji: string }> = [
  { kind: "maquis", label: "Maquis", emoji: "🍢" },
  { kind: "bistro", label: "Bistro", emoji: "🥂" },
  { kind: "bar", label: "Bar / Night", emoji: "🍹" },
  { kind: "cave", label: "Cave", emoji: "🍺" },
  { kind: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { kind: "fastfood", label: "Fast-food", emoji: "🍔" },
  { kind: "patisserie", label: "Pâtisserie", emoji: "🧁" },
  { kind: "boulangerie", label: "Boulangerie", emoji: "🥖" },
  { kind: "boucherie", label: "Boucherie", emoji: "🥩" },
  { kind: "poissonnerie", label: "Poissonnerie", emoji: "🐟" },
  { kind: "primeur", label: "Fruits & légumes", emoji: "🥕" },
  { kind: "epicerie", label: "Épicerie / Alimentation", emoji: "🛒" },
  { kind: "supermarche", label: "Supermarché", emoji: "🏬" },
  { kind: "boutique", label: "Boutique", emoji: "🛍️" },
  { kind: "friperie", label: "Friperie", emoji: "👖" },
  { kind: "pretaporter", label: "Prêt-à-porter", emoji: "👗" },
  { kind: "cosmetique", label: "Cosmétique", emoji: "💄" },
  { kind: "parfumerie", label: "Parfumerie", emoji: "🌸" },
  { kind: "bijouterie", label: "Bijouterie", emoji: "💍" },
  { kind: "salon", label: "Salon de coiffure", emoji: "💇🏾" },
  { kind: "tresses", label: "Tresses / Nattes", emoji: "🧑🏾" },
  { kind: "manucure", label: "Manucure / Pédicure", emoji: "💅" },
  { kind: "spa", label: "Spa / Institut", emoji: "🧖🏾‍♀️" },
  { kind: "atelier", label: "Atelier / Couture", emoji: "🧵" },
  { kind: "couture", label: "Couture", emoji: "🪡" },
  { kind: "cordonnerie", label: "Cordonnerie", emoji: "👞" },
  { kind: "menuiserie", label: "Menuiserie", emoji: "🪵" },
  { kind: "soudure", label: "Soudure / Ferronnerie", emoji: "🔩" },
  { kind: "plomberie", label: "Plomberie", emoji: "🚰" },
  { kind: "electricite", label: "Électricité", emoji: "💡" },
  { kind: "peinture", label: "Peinture bâtiment", emoji: "🎨" },
  { kind: "construction", label: "Bâtiment / BTP", emoji: "🏗️" },
  { kind: "briqueterie", label: "Briqueterie", emoji: "🧱" },
  { kind: "quincaillerie", label: "Quincaillerie", emoji: "🔨" },
  { kind: "garage", label: "Garage / Mécanique", emoji: "🔧" },
  { kind: "carwash", label: "Car-wash / Lavage", emoji: "🚿" },
  { kind: "station_service", label: "Station-service", emoji: "⛽" },
  { kind: "reparation_telephone", label: "Réparation téléphone", emoji: "📱" },
  { kind: "vente_telephone", label: "Vente téléphones", emoji: "📲" },
  { kind: "informatique", label: "Informatique / Bureautique", emoji: "💻" },
  { kind: "cybercafe", label: "Cybercafé", emoji: "🖥️" },
  { kind: "photocopie", label: "Photocopie / Impression", emoji: "🖨️" },
  { kind: "librairie", label: "Librairie", emoji: "📚" },
  { kind: "papeterie", label: "Papeterie", emoji: "✏️" },
  { kind: "pharmacie", label: "Pharmacie", emoji: "💊" },
  { kind: "clinique", label: "Clinique / Santé", emoji: "🏥" },
  { kind: "cabinet", label: "Cabinet (médical, dentaire, …)", emoji: "🩺" },
  { kind: "ecole", label: "École / Formation", emoji: "🏫" },
  { kind: "creche", label: "Crèche / Garderie", emoji: "👶" },
  { kind: "ecole_sport", label: "École de sport", emoji: "⚽" },
  { kind: "sport", label: "Club sportif", emoji: "🏆" },
  { kind: "gym", label: "Salle de sport", emoji: "🏋️" },
  { kind: "photographie", label: "Photo / Vidéo", emoji: "📸" },
  { kind: "eventiel", label: "Événementiel", emoji: "🎉" },
  { kind: "musique", label: "Musique / Studio", emoji: "🎵" },
  { kind: "location_salle", label: "Location de salle", emoji: "🏛️" },
  { kind: "location_voiture", label: "Location véhicule", emoji: "🚗" },
  { kind: "location_maison", label: "Location maison", emoji: "🏠" },
  { kind: "immobilier", label: "Immobilier", emoji: "🏘️" },
  { kind: "hotel", label: "Hôtel", emoji: "🏨" },
  { kind: "auberge", label: "Auberge", emoji: "🛏️" },
  { kind: "chambres", label: "Chambres meublées", emoji: "🛎️" },
  { kind: "transport", label: "Transport", emoji: "🚚" },
  { kind: "taxi", label: "Taxi", emoji: "🚕" },
  { kind: "gbaka", label: "Gbaka / Minicar", emoji: "🚐" },
  { kind: "moto_taxi", label: "Taxi moto", emoji: "🛵" },
  { kind: "livraison", label: "Livraison / Coursier", emoji: "📦" },
  { kind: "logistique", label: "Logistique / Fret", emoji: "🏗️" },
  { kind: "importexport", label: "Import / Export", emoji: "🌍" },
  { kind: "grossiste", label: "Grossiste", emoji: "📦" },
  { kind: "demi_grossiste", label: "Demi-grossiste", emoji: "🧾" },
  { kind: "marche", label: "Étal / Marché", emoji: "🥭" },
  { kind: "agriculture", label: "Agriculture", emoji: "🌾" },
  { kind: "elevage", label: "Élevage", emoji: "🐄" },
  { kind: "aviculture", label: "Aviculture", emoji: "🐔" },
  { kind: "porcherie", label: "Porcherie", emoji: "🐖" },
  { kind: "peche", label: "Pêche", emoji: "🎣" },
  { kind: "artisanat", label: "Artisanat", emoji: "🪶" },
  { kind: "sculpture", label: "Sculpture", emoji: "🗿" },
  { kind: "poterie", label: "Poterie", emoji: "🏺" },
  { kind: "vannerie", label: "Vannerie", emoji: "🧺" },
  { kind: "tisserand", label: "Tisserand", emoji: "🧶" },
  { kind: "teinture", label: "Teinture / Batik", emoji: "🎨" },
  { kind: "notaire", label: "Notaire / Huissier", emoji: "⚖️" },
  { kind: "avocat", label: "Avocat / Juridique", emoji: "🧑🏾‍⚖️" },
  { kind: "comptable", label: "Comptable / Finance", emoji: "🧮" },
  { kind: "consulting", label: "Consulting", emoji: "💼" },
  { kind: "marketing", label: "Marketing / Pub", emoji: "📣" },
  { kind: "creation_web", label: "Création web / Digital", emoji: "🌐" },
  { kind: "influence", label: "Influence / Créateur", emoji: "📢" },
  { kind: "ong", label: "ONG", emoji: "🤝" },
  { kind: "association", label: "Association", emoji: "🧑🏾‍🤝‍🧑🏾" },
  { kind: "eglise", label: "Église / Mosquée", emoji: "⛪" },
  { kind: "cooperative", label: "Coopérative", emoji: "🌱" },
  { kind: "tontine", label: "Tontine", emoji: "💰" },
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

const SERVER_STATE: TenantState = { tenants: [defaultTenant], activeId: "default" };
let cachedRaw: string | null = null;
let cachedActive: string | null = null;
let cachedState: TenantState = SERVER_STATE;

function read(): TenantState {
  if (typeof window === "undefined") return SERVER_STATE;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const activeRaw = window.localStorage.getItem(ACTIVE_KEY);
    if (raw === cachedRaw && activeRaw === cachedActive) return cachedState;
    const tenants: Tenant[] = raw ? JSON.parse(raw) : [defaultTenant];
    const safeTenants = tenants.length ? tenants : [defaultTenant];
    const activeId = activeRaw || safeTenants[0]?.id || null;
    cachedRaw = raw;
    cachedActive = activeRaw;
    cachedState = { tenants: safeTenants, activeId };
    return cachedState;
  } catch {
    cachedRaw = null;
    cachedActive = null;
    cachedState = SERVER_STATE;
    return SERVER_STATE;
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
  return SERVER_STATE;
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
