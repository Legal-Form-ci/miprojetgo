import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/miprojet-go-logo.png.asset.json";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Phone, Lock, User, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "MiProjet Go — Connexion" },
      { name: "description", content: "L'app de gestion des entrepreneurs, commerçants et TPE." },
    ],
  }),
  component: AuthPage,
});

function phoneToEmail(phone: string) {
  return `${phone.replace(/\D/g, "")}@miprojet.app`;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/auth" });
  const goNext = () => {
    if (next) window.location.href = next;
    else navigate({ to: "/dashboard", replace: true });
  };
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; fullName?: string }>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goNext();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate() {
    const cleaned = phone.replace(/\D/g, "");
    const errs: typeof errors = {};
    if (cleaned.length < 8) errs.phone = "Numéro trop court (8 chiffres min).";
    else if (cleaned.length > 15) errs.phone = "Numéro trop long.";
    if (password.length < 6) errs.password = "Mot de passe : 6 caractères minimum.";
    if (mode === "signup" && fullName.trim().length < 2) {
      errs.fullName = "Indique ton nom (au moins 2 lettres).";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const cleaned = phone.replace(/\D/g, "");
    setLoading(true);
    const email = phoneToEmail(cleaned);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName.trim(), phone: cleaned },
        },
      });
      if (error) {
        setLoading(false);
        toast.error(error.message === "User already registered"
          ? "Ce numéro a déjà un compte. Connecte-toi."
          : "Création impossible : " + error.message);
        return;
      }
      // Ecrit la fiche profil (si pas de trigger côté DB)
      if (data.user) {
        await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            phone: cleaned,
            full_name: fullName.trim(),
          } as never, { onConflict: "id" });
      }
      // Auto-signin si session n'est pas ouverte (email confirm désactivé)
      if (!data.session) {
        await supabase.auth.signInWithPassword({ email, password });
      }
      setLoading(false);
      toast.success("Compte créé. Bienvenue sur MiProjet Go !");
      goNext();
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErrors({ password: "Numéro ou mot de passe incorrect." });
      toast.error("Numéro ou mot de passe incorrect");
      return;
    }
    toast.success("Bienvenue !");
    goNext();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-white relative overflow-hidden">
      {/* Subtle warm accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--brand-blue)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand-green)" }}
      />

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <div
              aria-hidden
              className="absolute inset-0 rounded-[2rem] blur-2xl opacity-30"
              style={{ background: "var(--gradient-brand)" }}
            />
            <img
              src={logo.url}
              alt="MiProjet Go"
              className="relative h-24 w-auto object-contain drop-shadow-xl"
            />
          </div>
          <p className="text-sm font-medium text-brand-earth" style={{ color: "var(--brand-earth)" }}>
            Entrepreneuriat jeune — gestion simple &amp; pro.
          </p>
        </div>

        {/* Onglets Connexion / Créer un compte */}
        <div
          role="tablist"
          className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-2xl bg-[oklch(0.96_0.01_260)] border border-[oklch(0.92_0.02_260)]"
        >
          {(["login", "signup"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => { setMode(m); setErrors({}); }}
                className={`h-10 rounded-xl text-sm font-semibold transition-all ${
                  active ? "text-primary-foreground shadow-sm" : "text-muted-foreground"
                }`}
                style={active ? { background: "var(--gradient-primary)" } : undefined}
              >
                {m === "login" ? "J'ai déjà un compte" : "Créer mon compte"}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 space-y-4 border border-[oklch(0.92_0.02_70)]"
          style={{ boxShadow: "0 20px 50px -25px oklch(0.36 0.13 18 / 0.25)" }}
        >
          <div className="flex items-start gap-2 -mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground shrink-0"
              style={{ background: "var(--gradient-primary)" }}
            >
              {mode === "login" ? <Lock className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold" style={{ color: "var(--primary)" }}>
                {mode === "login" ? "Bon retour parmi nous" : "Ouvre ton espace MiProjet Go"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {mode === "login"
                  ? "Connecte-toi pour retrouver ton activité."
                  : "Tu es propriétaire d'une activité ? Crée ton espace en 30 secondes — tu deviens automatiquement responsable et peux ajouter tes gérants, caissiers et livreurs."}
              </p>
            </div>
          </div>

          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                Ton nom complet
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Kouamé N'Guessan"
                  value={fullName}
                  maxLength={80}
                  onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors({ ...errors, fullName: undefined }); }}
                  className={`w-full h-12 pl-10 pr-4 rounded-xl bg-input/40 border focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-base ${errors.fullName ? "border-red-500" : "border-border"}`}
                  required
                />
              </div>
              {errors.fullName && <p className="text-[11px] text-red-600 font-medium">{errors.fullName}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              Numéro de téléphone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="07 10 26 28 75"
                value={phone}
                maxLength={20}
                onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors({ ...errors, phone: undefined }); }}
                className={`w-full h-12 pl-10 pr-4 rounded-xl bg-input/40 border focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-base tabular-nums ${errors.phone ? "border-red-500" : "border-border"}`}
                required
              />
            </div>
            {errors.phone && <p className="text-[11px] text-red-600 font-medium">{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              {mode === "signup" ? "Choisis un mot de passe" : "Mot de passe"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPwd ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                maxLength={64}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                className={`w-full h-12 pl-10 pr-11 rounded-xl bg-input/40 border focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-base ${errors.password ? "border-red-500" : "border-border"}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Masquer" : "Afficher"}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-muted-foreground hover:text-primary flex items-center justify-center"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-[11px] text-red-600 font-medium">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
          >
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            {mode === "login"
              ? <>Pas encore de compte ?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="font-semibold text-primary underline underline-offset-2">
                    Inscris-toi ici
                  </button>
                </>
              : <>Tu as déjà un compte ?{" "}
                  <button type="button" onClick={() => setMode("login")} className="font-semibold text-primary underline underline-offset-2">
                    Connecte-toi
                  </button>
                </>}
          </p>
        </form>

        <p className="text-center text-xs mt-6 text-muted-foreground">
          © {new Date().getFullYear()} MiProjet Go — Écosystème MiProjet
        </p>
      </div>
    </div>
  );
}