export function cleanPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Indicatif par défaut : Côte d’Ivoire. */
export const DEFAULT_DIAL_CODE = "225";

/** Indicatifs CEDEAO connus (sert à reconnaître un numéro déjà international). */
const KNOWN_DIAL_CODES = ["225", "229", "226", "238", "220", "233", "224", "245", "231", "223", "227", "234", "221", "232", "228"];

/**
 * Chiffres E.164 SANS le "+" (ex. 2250759566087).
 * - "+225 07…", "00225 07…", "22507…" → 22507…
 * - "0759566087" (local CI, 10 chiffres) → 2250759566087
 * - "759566087" (local sans 0) → 225759566087
 */
export function phoneE164Digits(value: string, dialCode: string = DEFAULT_DIAL_CODE): string {
  const trimmed = value.trim();
  let digits = cleanPhoneDigits(trimmed);
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  const dial = cleanPhoneDigits(dialCode) || DEFAULT_DIAL_CODE;
  if (digits.startsWith(dial) && digits.length > 11) return digits;
  for (const code of KNOWN_DIAL_CODES) {
    if (digits.startsWith(code) && digits.length >= 11 && digits.length <= 15) return digits;
  }
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  return `${dial}${digits}`;
}

/** Numéro E.164 attendu par Supabase Auth (+2250759566087). */
export function phoneForSupabase(value: string, dialCode: string = DEFAULT_DIAL_CODE): string {
  return `+${phoneE164Digits(value, dialCode)}`;
}

/** Partie locale du numéro (sans indicatif), ex. 0759566087 pour un numéro ivoirien. */
export function phoneLocalPart(value: string, dialCode: string = DEFAULT_DIAL_CODE): string {
  const e164 = phoneE164Digits(value, dialCode);
  for (const code of [cleanPhoneDigits(dialCode), ...KNOWN_DIAL_CODES]) {
    if (code && e164.startsWith(code)) {
      const local = e164.slice(code.length);
      // CI / plusieurs pays CEDEAO : numéro local écrit avec un 0 initial
      return code === "225" && local.length === 9 ? `0${local}` : local;
    }
  }
  return e164;
}

/** E-mail interne canonique (jamais affiché) : dérivé du numéro international. */
export function legacyPhoneEmail(value: string, dialCode: string = DEFAULT_DIAL_CODE): string {
  return `${phoneE164Digits(value, dialCode)}@miprojet.app`;
}

/**
 * Toutes les variantes d’e-mail interne qu’un compte a pu recevoir au fil des versions
 * (numéro international, local avec 0, local sans 0). Sert au fallback de connexion.
 */
export function legacyPhoneEmailCandidates(value: string, dialCode: string = DEFAULT_DIAL_CODE): string[] {
  const e164 = phoneE164Digits(value, dialCode);
  const local = phoneLocalPart(value, dialCode);
  const raw = cleanPhoneDigits(value);
  const set = new Set<string>([e164, local, local.replace(/^0+/, ""), raw].filter(Boolean));
  return [...set].map((d) => `${d}@miprojet.app`);
}

/** Variantes du numéro telles qu’elles ont pu être stockées dans profiles.phone. */
export function phoneStoredVariants(value: string, dialCode: string = DEFAULT_DIAL_CODE): string[] {
  const e164 = phoneE164Digits(value, dialCode);
  const local = phoneLocalPart(value, dialCode);
  const raw = cleanPhoneDigits(value);
  return [...new Set([e164, `+${e164}`, local, local.replace(/^0+/, ""), raw].filter(Boolean))];
}

/** Affichage lisible : +225 07 59 56 60 87 */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const e164 = phoneE164Digits(value);
  for (const code of KNOWN_DIAL_CODES) {
    if (e164.startsWith(code)) {
      const local = e164.slice(code.length).replace(/(\d{2})(?=\d)/g, "$1 ");
      return `+${code} ${local}`;
    }
  }
  return `+${e164}`;
}
