import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/maestrabook-logo.png.asset.json";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Phone, Lock } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "MaestraBook — Connexion" },
      { name: "description", content: "Tes comptes. Ton contrôle." },
    ],
  }),
  component: AuthPage,
});

function phoneToEmail(phone: string) {
  return `${phone.replace(/\D/g, "")}@maestrabook.app`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  function validate() {
    const cleaned = phone.replace(/\D/g, "");
    const errs: typeof errors = {};
    if (cleaned.length < 8) errs.phone = "Numéro trop court (8 chiffres min).";
    else if (cleaned.length > 15) errs.phone = "Numéro trop long.";
    if (password.length < 6) errs.password = "Mot de passe : 6 caractères minimum.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const cleaned = phone.replace(/\D/g, "");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(cleaned),
      password,
    });
    setLoading(false);
    if (error) {
      setErrors({ password: "Numéro ou mot de passe incorrect." });
      toast.error("Numéro ou mot de passe incorrect");
      return;
    }
    toast.success("Bienvenue !");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-white relative overflow-hidden">
      {/* Subtle warm accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--gold)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 w-96 h-96 rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--primary)" }}
      />

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div
              aria-hidden
              className="absolute inset-0 rounded-[2rem] blur-2xl opacity-40"
              style={{ background: "var(--gradient-gold)" }}
            />
            <img
              src={logo.url}
              alt="MaestraBook"
              className="relative w-52 h-52 object-contain drop-shadow-xl"
            />
          </div>
          <p className="text-sm italic font-medium" style={{ color: "oklch(0.55 0.14 60)" }}>
            Tes comptes. Ton contrôle.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 space-y-4 border border-[oklch(0.92_0.02_70)]"
          style={{ boxShadow: "0 20px 50px -25px oklch(0.36 0.13 18 / 0.25)" }}
        >
          <h2 className="font-display text-xl font-semibold" style={{ color: "var(--primary)" }}>
            Connexion
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Entre ton numéro et ton mot de passe.
          </p>

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
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Se connecter"}
          </button>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Accès réservé. Contacte l'administratrice pour obtenir un compte.
          </p>
        </form>

        <p className="text-center text-xs mt-6 text-muted-foreground">
          © {new Date().getFullYear()} Cave chez Maestra
        </p>
      </div>
    </div>
  );
}