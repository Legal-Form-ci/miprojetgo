import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/maestrabook-logo.png.asset.json";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 8) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    if (password.length < 6) {
      toast.error("Mot de passe trop court");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(cleaned),
      password,
    });
    setLoading(false);
    if (error) {
      toast.error("Numéro ou mot de passe incorrect");
      return;
    }
    toast.success("Bienvenue !");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-background rounded-3xl p-4 mb-5" style={{ boxShadow: "var(--shadow-elegant)" }}>
            <img src={logo.url} alt="MaestraBook" className="w-28 h-28 object-contain" />
          </div>
          <h1 className="font-display text-3xl font-bold text-background">MaestraBook</h1>
          <p className="text-sm mt-1 italic" style={{ color: "var(--gold)" }}>
            Tes comptes. Ton contrôle.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl p-6 space-y-4"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <h2 className="font-display text-xl font-semibold text-primary mb-1">Connexion</h2>
          <p className="text-xs text-muted-foreground -mt-2 mb-2">
            Entre ton numéro et ton mot de passe.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="07 10 26 28 75"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-input/40 border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-base"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              Mot de passe
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-input/40 border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-base"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-card)" }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Se connecter"}
          </button>

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Accès réservé. Contacte l'administratrice pour obtenir un compte.
          </p>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "oklch(0.85 0.05 75)" }}>
          © {new Date().getFullYear()} Cave chez Maestra
        </p>
      </div>
    </div>
  );
}