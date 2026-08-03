// Préférences de salutation vocale (stockées localement, par appareil).
const KEY = "miprojetgo.voice-greeting.v1";

export type GreetingFrequency = "always" | "once-per-session" | "once-per-day" | "never";

export type GreetingPrefs = {
  enabled: boolean;
  useName: boolean;
  customText: string; // {nom} = prénom + nom, {salut} = Bonjour/Bonsoir…
  frequency: GreetingFrequency;
};

export const DEFAULT_GREETING_TEXT =
  "{salut} {nom}. Parle, l'IA comprend le français, le baoulé, l'anglais et l'espagnol.";

export const DEFAULT_GREETING: GreetingPrefs = {
  enabled: true,
  useName: true,
  customText: DEFAULT_GREETING_TEXT,
  frequency: "once-per-session",
};

export function getGreetingPrefs(): GreetingPrefs {
  if (typeof window === "undefined") return DEFAULT_GREETING;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_GREETING;
    return { ...DEFAULT_GREETING, ...(JSON.parse(raw) as Partial<GreetingPrefs>) };
  } catch {
    return DEFAULT_GREETING;
  }
}

export function saveGreetingPrefs(prefs: GreetingPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function salutation(d = new Date()): string {
  const h = d.getHours();
  return h < 5 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
}

export function buildGreeting(prefs: GreetingPrefs, name: string): string {
  const text = prefs.customText.trim() || DEFAULT_GREETING_TEXT;
  return text
    .replaceAll("{salut}", salutation())
    .replaceAll("{nom}", prefs.useName ? name : "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

const SESSION_KEY = "miprojetgo.voice-greeted.session";
const DAY_KEY = "miprojetgo.voice-greeted.day";

/** Doit-on prononcer la salutation maintenant ? Marque l'état si oui. */
export function shouldGreet(prefs: GreetingPrefs): boolean {
  if (!prefs.enabled || prefs.frequency === "never") return false;
  if (typeof window === "undefined") return false;
  if (prefs.frequency === "always") return true;
  if (prefs.frequency === "once-per-session") {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    sessionStorage.setItem(SESSION_KEY, "1");
    return true;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(DAY_KEY) === today) return false;
  localStorage.setItem(DAY_KEY, today);
  return true;
}