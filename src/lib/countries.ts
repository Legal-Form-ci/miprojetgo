export type Country = { code: string; name: string; dial: string; flag: string };

/** Les 15 pays de la CEDEAO. */
export const CEDEAO_COUNTRIES: Country[] = [
  { code: "CI", name: "Côte d’Ivoire", dial: "225", flag: "🇨🇮" },
  { code: "BJ", name: "Bénin", dial: "229", flag: "🇧🇯" },
  { code: "BF", name: "Burkina Faso", dial: "226", flag: "🇧🇫" },
  { code: "CV", name: "Cap-Vert", dial: "238", flag: "🇨🇻" },
  { code: "GM", name: "Gambie", dial: "220", flag: "🇬🇲" },
  { code: "GH", name: "Ghana", dial: "233", flag: "🇬🇭" },
  { code: "GN", name: "Guinée", dial: "224", flag: "🇬🇳" },
  { code: "GW", name: "Guinée-Bissau", dial: "245", flag: "🇬🇼" },
  { code: "LR", name: "Libéria", dial: "231", flag: "🇱🇷" },
  { code: "ML", name: "Mali", dial: "223", flag: "🇲🇱" },
  { code: "NE", name: "Niger", dial: "227", flag: "🇳🇪" },
  { code: "NG", name: "Nigéria", dial: "234", flag: "🇳🇬" },
  { code: "SN", name: "Sénégal", dial: "221", flag: "🇸🇳" },
  { code: "SL", name: "Sierra Leone", dial: "232", flag: "🇸🇱" },
  { code: "TG", name: "Togo", dial: "228", flag: "🇹🇬" },
];

export const DEFAULT_COUNTRY = CEDEAO_COUNTRIES[0];

export function findCountryByDial(dial: string): Country {
  return CEDEAO_COUNTRIES.find((c) => c.dial === dial) ?? DEFAULT_COUNTRY;
}
