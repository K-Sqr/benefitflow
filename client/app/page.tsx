"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Orb from "@/components/ui/orb";
import { useVapiVoice, type CallResult } from "@/lib/hooks/useVapiVoice";
import {
  useLanguage,
  LANGUAGES,
  HERO_LANGUAGES,
  SPEAK_IN_YOUR_LANGUAGE,
  getTranslations,
} from "@/app/context/LanguageContext";
import { cn, getReportApiBaseUrl } from "@/lib/utils";

const ELIGIBILITY_ITEMS = [
  { id: "household", label: "Household Size", icon: "👥" },
  { id: "income", label: "Monthly Income", icon: "💰" },
  { id: "zip", label: "Zip Code", icon: "📍" },
] as const;

/** Infer which eligibility item the user just answered from their transcript */
function inferEligibilityFromTranscript(
  transcript: string,
): Partial<Record<string, boolean>> {
  const t = transcript.toLowerCase().trim();
  const out: Partial<Record<string, boolean>> = {};
  const householdNumbers =
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/.test(
      t,
    ) ||
    /\b([1-9]|1[0-2])\b/.test(t) ||
    /\d+\s*(people|person|in my (house|home|family)|household)/.test(t) ||
    /(we have|there are|i have|we're|it's just|just)\s*(me|\d+|one|two|three|four|five|six|seven|eight|nine|ten)/.test(
      t,
    );
  if (
    householdNumbers ||
    /(people|person|household|family size|live with me)/.test(t)
  ) {
    out.household = true;
  }
  const hasMoney =
    /\$?\s*\d{1,3}(,\d{3})*(\.\d{2})?/.test(t) ||
    /\$?\s*\d+(\s*(hundred|thousand|k|grand))?(\s*(a month|per month|monthly|dollars?))?/.test(
      t,
    ) ||
    /(income|salary|earn|make|pay|bring home).*(\d+|\$)/.test(t);
  if (hasMoney) {
    out.income = true;
  }
  if (
    /\b\d{5}\b/.test(t) ||
    /(zip|postal|address|area code|live in|my zip|zip code)/.test(t)
  ) {
    out.zip = true;
  }
  return out;
}

function inferEligibilityFromAssistantMessage(
  assistantMessage: string,
): Partial<Record<string, boolean>> {
  const m = assistantMessage.toLowerCase();
  const out: Partial<Record<string, boolean>> = {};
  if (
    /(income|how much|salary|earn|make|pay|monthly income|total income)/.test(m)
  ) {
    out.household = true;
  }
  if (
    /(zip|zip code|postal|address|where do you live|location|area code)/.test(m)
  ) {
    out.household = true;
    out.income = true;
  }
  return out;
}

export default function Home() {
  const { language, setLanguage } = useLanguage();
  const t = getTranslations(language.code);
  const [view, setView] = useState<"hero" | "agent" | "result">("hero");
  const [eligibility, setEligibility] = useState<Record<string, boolean>>({
    household: false,
    income: false,
    zip: false,
  });
  const [aiMessage, setAiMessage] = useState(
    "Hi, I'm here to help. In your own words, tell me how many people live in your home?",
  );
  const [demoTranscript, setDemoTranscript] = useState("");
  const [demoAssistantSpeaking, setDemoAssistantSpeaking] = useState(false);
  const [callResult, setCallResult] = useState<CallResult | null>(null);
  const [resultEmail, setResultEmail] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const demoSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const {
    isConfigured: vapiConfigured,
    startCall,
    endCall,
    isCallActive,
    isAssistantSpeaking,
    userTranscript,
    lastAssistantMessage,
    error: vapiError,
  } = useVapiVoice({
    language: language.code,
    onCallEnd: useCallback((result: CallResult) => {
      setCallResult(result);
      setView("result");
    }, []),
  });

  useEffect(() => {
    if (view !== "agent") return;
    const userText = vapiConfigured ? userTranscript : demoTranscript;
    const assistantText = vapiConfigured ? lastAssistantMessage : aiMessage;
    const fromUser = inferEligibilityFromTranscript(userText);
    const fromAssistant = inferEligibilityFromAssistantMessage(assistantText);
    const merged = { ...fromUser, ...fromAssistant };
    setEligibility((prev) => {
      const next = { ...prev };
      (Object.entries(merged) as [keyof typeof next, boolean][]).forEach(
        ([key, val]) => {
          if (val === true) next[key] = true;
        },
      );
      return next;
    });
  }, [
    view,
    vapiConfigured,
    userTranscript,
    demoTranscript,
    lastAssistantMessage,
    aiMessage,
  ]);

  const displayAiMessage =
    vapiConfigured && view === "agent"
      ? lastAssistantMessage ||
        "Hi, I'm here to help. In your own words, tell me how many people live in your home?"
      : aiMessage;

  const runDemoMode = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    setView("agent");
    setDemoTranscript("");
    setEligibility({ household: false, income: false, zip: false });
    setAiMessage(
      "Hi, I'm here to help. In your own words, tell me how many people live in your home?",
    );

    const t1 = setTimeout(
      () => setEligibility((e) => ({ ...e, household: true })),
      1200,
    );
    const t2 = setTimeout(
      () => setAiMessage("Got it. What's your total monthly income?"),
      2200,
    );
    const t3 = setTimeout(
      () => setEligibility((e) => ({ ...e, income: true })),
      3000,
    );
    const t4 = setTimeout(() => {
      setCallResult({ fromLiveCall: false, lastAssistantMessage: "" });
      setView("result");
    }, 5400);
    timeoutsRef.current = [t1, t2, t3, t4];
  }, []);

  const startCheck = useCallback(() => {
    setCallResult(null);
    if (vapiConfigured) {
      setView("agent");
      setDemoTranscript("");
      setEligibility({ household: false, income: false, zip: false });
      void startCall();
    } else {
      runDemoMode();
    }
  }, [vapiConfigured, startCall, runDemoMode]);

  return (
    <div className="min-h-screen bg-[#F9F8F3]">
      <Navbar />

      {view === "hero" && (
        <main className="animate-in fade-in duration-500 pt-20 pb-16 px-6 md:pt-28 md:pb-24 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              {HERO_LANGUAGES.map((opt) => {
                const isActive = language.code === opt.code;
                return (
                  <button
                    key={opt.code}
                    onClick={() => {
                      const l = LANGUAGES.find(
                        (lang) => lang.code === opt.code,
                      );
                      if (l) setLanguage(l);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                      isActive
                        ? "border-[#1B7840] bg-[#1B7840]/10 text-[#1B7840]"
                        : "border-[#E5E7EB] bg-white text-[#374151]",
                    )}
                  >
                    <span>{opt.flag}</span>
                    <span>{opt.labelEn}</span>
                  </button>
                );
              })}
            </div>
            <Badge className="mb-10 rounded-full bg-[#EFE4DC]/80 text-[#111827] border-0 px-4 py-1.5">
              🚀 {t.heroBadge}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-10">
              <span className="block text-[#1B7840]">{t.heroTitle1}</span>
              <span className="block text-[#79B78E]">{t.heroTitle2}</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mb-12">
              {t.heroSubtitle}
            </p>
            <Button
              onClick={startCheck}
              size="lg"
              className="bg-[#1B7840] hover:bg-[#164d30] text-white rounded-full px-10 h-16 text-lg font-semibold shadow-lg"
            >
              {vapiConfigured ? t.btnStartCheckLive : t.btnStartCheckDemo}
            </Button>
          </div>
        </main>
      )}

      {view === "agent" && (
        <main className="animate-in fade-in pt-0 pb-8 px-4 flex flex-col min-h-[calc(100vh-80px)]">
          <div className="w-full h-1.5 bg-[#E5E7EB]">
            <div
              className="h-full bg-[#1A5D3B] transition-all duration-500"
              style={{
                width: `${(Object.values(eligibility).filter(Boolean).length / 3) * 100}%`,
              }}
            />
          </div>
          <div className="flex flex-col items-center justify-center flex-1 max-w-lg mx-auto">
            <div className="w-full max-w-md mb-6 h-[320px] relative flex items-center justify-center">
              <Orb isSpeaking={isAssistantSpeaking} isActive={isCallActive} />
            </div>
            <p className="text-center text-lg font-medium text-[#111827] mb-8">
              {displayAiMessage}
            </p>
            {isCallActive && (
              <Button
                variant="outline"
                onClick={endCall}
                className="rounded-full"
              >
                {t.endCall}
              </Button>
            )}
          </div>
        </main>
      )}

      {view === "result" && (
        <main className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-12 pb-16 px-6 min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border-2 border-[#E5E7EB] bg-white shadow-xl p-8 text-center">
            <p className="text-2xl font-bold text-[#1A5D3B] mb-3">
              {t.resultLiveTitle}
            </p>
            <p className="text-gray-600 mb-8">{t.resultLiveDesc}</p>

            {reportSent ? (
              <p className="text-[#1A5D3B] font-medium">
                Report sent to {resultEmail}!
              </p>
            ) : (
              <div className="space-y-4">
                <input
                  type="email"
                  value={resultEmail}
                  onChange={(e) => setResultEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full px-4 py-3 rounded-xl border-2 bg-[#F9F8F3] focus:ring-2 focus:ring-[#1A5D3B] outline-none"
                />
                {reportError && (
                  <p className="text-red-600 text-sm">{reportError}</p>
                )}
                <Button
                  className="w-full bg-[#1A5D3B] hover:bg-[#164d30] text-white rounded-full h-12"
                  disabled={reportLoading || !resultEmail.includes("@")}
                  onClick={async () => {
                    setReportLoading(true);
                    setReportError(null);

                    const apiUrl = getReportApiBaseUrl();
                    try {
                      const res = await fetch(`${apiUrl}/generate-report`, {
                        method: "POST",
                        mode: "cors",
                        credentials: "omit",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: resultEmail,
                          callId: callResult?.callId ?? "",
                          language: language.code,
                        }),
                      });
                      if (!res.ok) {
                        const text = await res.text();
                        let detail = text;
                        try {
                          const j = JSON.parse(text);
                          if (typeof j.detail === "string") detail = j.detail;
                        } catch {
                          detail = text.slice(0, 120);
                        }
                        throw new Error(detail);
                      }
                      setReportSent(true);
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : "";
                      const isNetwork =
                        msg.includes("Failed to fetch") ||
                        msg.includes("NetworkError") ||
                        msg === "Failed to fetch";
                      setReportError(
                        isNetwork
                          ? "Can't reach the server. If you're on benefitflow.me, the backend may need to allow this domain in CORS (and be redeployed)."
                          : msg || "Something went wrong. Please try again.",
                      );
                    } finally {
                      setReportLoading(false);
                    }
                  }}
                >
                  {reportLoading ? "Sending..." : t.btnEmailLink}
                </Button>
              </div>
            )}
            <button
              onClick={() => setView("hero")}
              className="mt-6 text-sm text-gray-500 hover:text-black"
            >
              Start Over
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
