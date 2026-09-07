import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Phone, Search } from "lucide-react";
import { CEDEAO_COUNTRIES, findCountryByDial, type Country } from "@/lib/countries";

type Props = {
  id?: string;
  dial: string;
  onDialChange: (dial: string) => void;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  required?: boolean;
  ariaLabel?: string;
};

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Champ téléphone avec sélecteur d’indicatif CEDEAO (drapeaux + recherche). */
export function PhoneInput({
  id,
  dial,
  onDialChange,
  value,
  onChange,
  error,
  placeholder = "07 59 56 60 87",
  className = "",
  autoComplete = "tel-national",
  required,
  ariaLabel = "Numéro de téléphone",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const country = findCountryByDial(dial);

  const filtered = useMemo(() => {
    const q = normalize(query.trim()).replace(/^\+/, "");
    if (!q) return CEDEAO_COUNTRIES;
    return CEDEAO_COUNTRIES.filter(
      (c) => normalize(c.name).includes(q) || c.dial.includes(q) || c.code.toLowerCase() === q,
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    setTimeout(() => searchRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  function pick(c: Country) {
    onDialChange(c.dial);
    setOpen(false);
    setQuery("");
  }

  const border = error ? "border-red-500" : "border-border";

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className={`flex h-12 rounded-xl bg-input/40 border ${border} focus-within:ring-2 focus-within:ring-ring overflow-visible`}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Indicatif pays : ${country.name} +${country.dial}`}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 pl-3 pr-2 border-r border-border/70 text-sm font-semibold text-foreground shrink-0 rounded-l-xl hover:bg-secondary/60 transition-colors"
        >
          <span className="text-lg leading-none" aria-hidden>{country.flag}</span>
          <span className="tabular-nums">+{country.dial}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <div className="relative flex-1 min-w-0">
          <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id={id}
            aria-label={ariaLabel}
            type="tel"
            inputMode="numeric"
            autoComplete={autoComplete}
            placeholder={placeholder}
            value={value}
            maxLength={20}
            required={required}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full pl-9 pr-3 bg-transparent focus:outline-none text-foreground text-base tabular-nums rounded-r-xl"
          />
        </div>
      </div>

      {open && (
        <div
          role="listbox"
          aria-label="Pays de la CEDEAO"
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-border bg-background/80">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un pays ou un indicatif…"
                aria-label="Rechercher un pays"
                className="w-full h-10 pl-8 pr-3 rounded-xl bg-input/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-xs text-muted-foreground text-center">Aucun pays CEDEAO trouvé.</li>
            )}
            {filtered.map((c) => {
              const selected = c.dial === country.dial;
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(c)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                      selected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-secondary"
                    }`}
                  >
                    <span className="text-xl leading-none" aria-hidden>{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums text-muted-foreground">+{c.dial}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
