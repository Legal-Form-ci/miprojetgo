export function cleanPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Local numbers without a country code default to Côte d’Ivoire (+225). */
export function phoneForSupabase(value: string): string {
  const trimmed = value.trim();
  const digits = cleanPhoneDigits(trimmed);
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("225")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+225${digits}`;
  return `+${digits}`;
}

export function legacyPhoneEmail(value: string): string {
  return `${cleanPhoneDigits(value)}@miprojet.app`;
}