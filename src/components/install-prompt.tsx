import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "mpg.install-prompt.last";
const SHOW_DELAY_MS = 1200;
const COUNTDOWN_SECONDS = 30;
const RING_RADIUS = 172;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPromptEvent: BeforeInstallPromptEvent | null = null;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneNav = (navigator as unknown as { standalone?: boolean }).standalone === true;
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const androidAppReferrer = document.referrer?.startsWith("android-app://") ?? false;
  return standaloneNav || displayModeStandalone || androidAppReferrer;
}

function isInIframe(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const forceInstall = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const params = new URLSearchParams(window.location.search);
    forceInstall.current = params.get("install") === "1";

    if (isStandalone()) return;
    if (isInIframe() && !forceInstall.current) return;

    if (!forceInstall.current) {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last) {
        const elapsed = Date.now() - Number(last);
        if (elapsed < 24 * 60 * 60 * 1000) return;
      }
    }

    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [mounted]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      deferredPromptEvent = event as BeforeInstallPromptEvent;
      setDeferredEvent(deferredPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!visible) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(COUNTDOWN_SECONDS);
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [visible]);

  function close() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
    setShowHelp(false);
  }

  async function handleInstallClick() {
    if (deferredPromptEvent) {
      await deferredPromptEvent.prompt();
      const choice = await deferredPromptEvent.userChoice;
      deferredPromptEvent = null;
      setDeferredEvent(null);
      if (choice.outcome === "accepted") {
        toast.success("MiPROJET Go est en cours d'installation");
        close();
      }
    } else {
      setShowHelp(true);
    }
  }

  if (!mounted || !visible) return null;

  const dashOffset = RING_CIRCUMFERENCE * (1 - secondsLeft / COUNTDOWN_SECONDS);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ animation: "mpg-install-backdrop-in 300ms ease-out" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mpg-install-headline"
    >
      <div
        className="relative flex h-[19rem] w-[19rem] items-center justify-center sm:h-[22rem] sm:w-[22rem]"
        style={{ animation: "mpg-install-pop-in 550ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        {/* pulsing glow */}
        <div
          className="absolute inset-[-1rem] rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(circle, var(--brand-green) 0%, var(--brand-blue) 60%, transparent 70%)",
            animation: "mpg-install-glow-pulse 3s ease-in-out infinite",
          }}
        />

        {/* rotating conic ring */}
        <div
          className="mpg-install-ring absolute inset-[-0.4rem] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, var(--brand-blue), var(--brand-green), var(--brand-blue))",
            animation: "mpg-install-ring-rotate 8s linear infinite",
            padding: "0.35rem",
            WebkitMask:
              "radial-gradient(closest-side, transparent calc(100% - 0.35rem), #000 calc(100% - 0.35rem))",
            mask: "radial-gradient(closest-side, transparent calc(100% - 0.35rem), #000 calc(100% - 0.35rem))",
          }}
        />

        {/* countdown ring */}
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 360 360"
          aria-hidden="true"
        >
          <circle
            cx="180"
            cy="180"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth="2"
          />
          <circle
            cx="180"
            cy="180"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--brand-green)"
            strokeWidth="2"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>

        {/* card */}
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-full bg-background px-8 text-center shadow-[var(--shadow-elegant)]">
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="absolute right-6 top-8 flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground shadow-md"
          >
            <X className="h-4 w-4" />
          </button>

          {!showHelp ? (
            <>
              <img
                src="/brand/logo.png"
                alt="MiPROJET Go"
                className="mx-auto h-14 w-auto object-contain"
              />
              <p className="text-xs font-medium text-muted-foreground">Application MiPROJET Go</p>
              <h2
                id="mpg-install-headline"
                className="font-display text-lg font-bold text-primary"
              >
                Installe l'appli sur ton téléphone
              </h2>
              <p className="text-xs text-muted-foreground">
                Accès rapide, plein écran, même hors ligne.
              </p>

              <button
                type="button"
                onClick={handleInstallClick}
                className="mpg-install-btn-bounce relative mt-1 flex items-center gap-2 overflow-hidden rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md active:scale-95"
                style={{
                  background: "var(--gradient-primary)",
                  animation: "mpg-install-btn-bounce 1.8s ease-in-out infinite",
                }}
              >
                <span
                  className="pointer-events-none absolute inset-0 -z-0 w-1/3 bg-white/40"
                  style={{ animation: "mpg-install-shimmer 2.4s ease-in-out infinite" }}
                />
                <Download className="relative z-10 h-4 w-4" />
                <span className="relative z-10">Installer l'application</span>
              </button>

              <button
                type="button"
                onClick={close}
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
              >
                Plus tard
              </button>

              <p className="text-[10px] text-muted-foreground">
                Fermeture dans {secondsLeft} s
              </p>
            </>
          ) : (
            <>
              <h2
                id="mpg-install-headline"
                className="font-display text-base font-bold text-primary"
              >
                Comment installer
              </h2>
              <p className="text-xs text-muted-foreground">
                {isIOS()
                  ? "Appuie sur Partager puis \u201CSur l'écran d'accueil\u201D"
                  : "Ouvre le menu du navigateur puis \u201CInstaller l'application\u201D / \u201CAjouter à l'écran d'accueil\u201D"}
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-2 rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                Compris
              </button>
              <p className="text-[10px] text-muted-foreground">
                Fermeture dans {secondsLeft} s
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
