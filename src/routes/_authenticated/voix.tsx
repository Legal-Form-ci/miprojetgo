import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { parseVoiceOperation, type VoiceParsedOperation } from "@/lib/voice-parse.functions";

export const Route = createFileRoute("/_authenticated/voix")({
  head: () => ({ meta: [{ title: "Saisie vocale — MaestraBook" }] }),
  ssr: false,
  component: VoicePage,
});

type SpeechCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function VoicePage() {
  const navigate = useNavigate();
  const parse = useServerFn(parseVoiceOperation);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VoiceParsedOperation | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const recRef = useRef<ReturnType<SpeechCtor> | null>(null);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
    return () => recRef.current?.abort();
  }, []);

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return toast.error("Reconnaissance vocale non disponible sur ce navigateur.");
    setResult(null);
    setTranscript("");
    setInterim("");
    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i] as ArrayLike<{ transcript: string }> & { isFinal?: boolean };
        const txt = res[0]?.transcript ?? "";
        if ((res as { isFinal?: boolean }).isFinal) finalText += txt + " ";
        else interimText += txt;
      }
      if (finalText) setTranscript((prev) => (prev + " " + finalText).trim());
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") toast.error(`Micro : ${e.error}`);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }

  function stop() {
    recRef.current?.stop();
    setListening(false);
  }

  async function analyze() {
    const text = (transcript + " " + interim).trim();
    if (!text) return toast.error("Parle d'abord, puis appuie sur Analyser.");
    setAnalyzing(true);
    try {
      const res = await parse({ data: { transcript: text } });
      setResult(res);
    } catch (e) {
      toast.error((e as Error).message || "Analyse impossible.");
    } finally {
      setAnalyzing(false);
    }
  }

  function validate() {
    if (!result) return;
    navigate({
      to: "/operations/new",
      search: {
        type: result.type,
        montant: String(result.montant),
        description: result.description,
        categorie: result.categorie,
        mode: result.mode_paiement,
        note: result.note ?? undefined,
      },
    });
  }

  const goldStyle = { background: "var(--gradient-gold)", color: "#3a2410" };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={goldStyle}
        >
          <Mic className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-primary leading-tight">Saisie vocale</h1>
          <p className="text-xs text-muted-foreground">Parle simplement. L'IA comprend et remplit pour toi.</p>
        </div>
      </header>

      {supported === false && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm flex gap-2 items-start">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            Ton navigateur ne gère pas la reconnaissance vocale. Utilise Chrome sur Android ou Safari récent, ou écris la phrase ci-dessous.
          </div>
        </div>
      )}

      <div className="rounded-3xl p-6 text-center" style={goldStyle}>
        <button
          onClick={listening ? stop : start}
          disabled={supported === false}
          className={`mx-auto w-28 h-28 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 ${listening ? "animate-pulse" : ""}`}
          style={{
            background: listening
              ? "linear-gradient(135deg, #991b1b, #ef4444)"
              : "linear-gradient(135deg, #4a1322, #7a1f37)",
            boxShadow: "0 18px 40px -16px rgba(0,0,0,0.5)",
          }}
        >
          {listening ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
        </button>
        <p className="mt-3 text-sm font-semibold">
          {listening ? "J'écoute… appuie pour arrêter" : "Appuie et parle"}
        </p>
        <p className="text-[11px] opacity-75 mt-1">
          Ex : « j'ai vendu 2 casiers de 66 à 6500 », « acheté 5 litres essence 4000 »
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Ce que tu as dit</label>
        <textarea
          rows={3}
          value={transcript + (interim ? " " + interim : "")}
          onChange={(e) => { setTranscript(e.target.value); setInterim(""); }}
          placeholder="La transcription apparaît ici. Tu peux la corriger avant d'analyser."
          className="mt-1 w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
        />
      </div>

      <button
        onClick={analyze}
        disabled={analyzing || (!transcript.trim() && !interim.trim())}
        className="w-full h-12 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: "var(--gradient-primary)" }}
      >
        {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        {analyzing ? "Analyse en cours…" : "Analyser avec l'IA"}
      </button>

      {result && (
        <div
          className="rounded-2xl border-2 p-4 space-y-3"
          style={{
            borderColor: result.type === "entree" ? "#10b981" : "#ef4444",
            background: "var(--card)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide text-white"
              style={{
                background: result.type === "entree"
                  ? "linear-gradient(135deg, #047857, #10b981)"
                  : "linear-gradient(135deg, #991b1b, #ef4444)",
              }}
            >
              {result.type === "entree" ? "Entrée" : "Sortie"}
            </span>
            <span className={`text-[11px] font-semibold ${result.confidence === "faible" ? "text-destructive" : "text-muted-foreground"}`}>
              Confiance : {result.confidence}
            </span>
          </div>
          <Row k="Montant" v={`${new Intl.NumberFormat("fr-FR").format(result.montant)} FCFA`} strong />
          <Row k="Description" v={result.description} />
          <Row k="Catégorie" v={result.categorie} />
          <Row k="Paiement" v={result.mode_paiement} />
          {result.raison && <p className="text-[11px] italic text-muted-foreground">IA : {result.raison}</p>}
          <button
            onClick={validate}
            className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
            style={{
              background: result.type === "entree"
                ? "linear-gradient(135deg, #047857, #10b981)"
                : "linear-gradient(135deg, #991b1b, #ef4444)",
            }}
          >
            Valider et corriger <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={`text-right ${strong ? "font-display font-bold text-primary text-base" : "font-medium text-foreground"}`}>{v}</span>
    </div>
  );
}