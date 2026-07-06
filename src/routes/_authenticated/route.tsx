import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LayoutDashboard, PlusCircle, History, LogOut, Users, Mic, User as UserIcon, Package } from "lucide-react";
import logo from "@/assets/miprojet-go-logo.png.asset.json";
import { SyncBanner } from "@/components/sync-banner";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { TenantSwitcher } from "@/components/tenant-switcher";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useIdleLogout(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user.id]);

  async function signOut() {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem("maestrabook.rq-cache.v1");
      localStorage.removeItem("maestrabook.offline-queue.v1");
      localStorage.removeItem("mpg_export_unlock_code");
    } catch {
      /* noop */
    }
    navigate({ to: "/auth", replace: true });
  }

  const tabs: Array<{
    to: "/dashboard" | "/operations" | "/historique" | "/import" | "/synchronisation" | "/utilisateurs" | "/voix" | "/profil" | "/produits";
    label: string;
    icon: typeof LayoutDashboard;
    primary?: boolean;
    adminOnly?: boolean;
  }> = [
    { to: "/dashboard", label: "Accueil", icon: LayoutDashboard },
    { to: "/voix", label: "Voix", icon: Mic },
    { to: "/operations", label: "Saisir", icon: PlusCircle, primary: true },
    { to: "/produits", label: "Produits", icon: Package },
    { to: "/historique", label: "Historique", icon: History },
    { to: "/utilisateurs", label: "Users", icon: Users, adminOnly: true },
  ];
  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/90 border-b border-border shadow-[var(--shadow-soft)]">
        <div className="max-w-2xl mx-auto px-4 h-16 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/dashboard" className="flex items-center shrink-0">
            <img src={logo.url} alt="MiProjet Go" className="h-9 w-auto object-contain" />
            <span className="sr-only">MiProjet Go</span>
          </Link>
          {/* Sélecteur d'espace d'activité (multi-tenant UI, DB à venir) */}
          <TenantSwitcher />
          <div className="flex items-center gap-1 shrink-0">
            <Link
              to="/profil"
              className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
              aria-label="Profil"
            >
              <UserIcon className="w-4 h-4" />
            </Link>
            <button
              onClick={signOut}
              className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <SyncBanner />
      <main className="flex-1 pb-24">
        <div className="max-w-2xl mx-auto px-4 pt-5">
          <Outlet />
        </div>
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-2xl mx-auto px-2 h-16 flex items-center justify-around">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = pathname.startsWith(t.to);
            if (t.primary) {
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className="flex flex-col items-center -mt-7"
                >
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center text-primary-foreground"
                    style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
                  >
                    <Icon className="w-7 h-7" />
                  </span>
                  <span className="text-[10px] font-semibold text-primary mt-1">{t.label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center gap-1 text-xs ${
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}