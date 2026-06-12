import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const IDLE_MS = 5 * 60 * 1000;

export function useIdleLogout(enabled: boolean) {
  const navigate = useNavigate();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        try {
          await supabase.auth.signOut();
        } finally {
          toast.message("Session fermée après 5 min d'inactivité");
          navigate({ to: "/auth", replace: true });
        }
      }, IDLE_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "touchstart",
      "click",
      "scroll",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, navigate]);
}