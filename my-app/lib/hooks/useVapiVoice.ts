"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Vapi from "@vapi-ai/web";

export interface CallResult {
  /** Whether the result is from a real Vapi call (vs demo) */
  fromLiveCall: boolean;
  /** Last thing the assistant said (for showing on result page) */
  lastAssistantMessage: string;
  /** Vapi call ID (only set for live calls; used for /generate-report) */
  callId?: string;
}

export interface UseVapiVoiceOptions {
  /** Language code for assistant variable (e.g. "en", "es"). Passed as variableValues.language */
  language?: string;
  /** Called when the call ends; pass call result so the UI can show the right next page */
  onCallEnd?: (result: CallResult) => void;
}

/** Read Vapi env in client so Next.js inlines them when the bundle runs in the browser */
function getVapiConfig() {
  if (typeof window === "undefined") return { publicKey: "", assistantId: "" };
  return {
    publicKey: (process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "").trim(),
    assistantId: (process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "").trim(),
  };
}

export function useVapiVoice(options: UseVapiVoiceOptions = {}) {
  const { language = "en", onCallEnd } = options;
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [lastAssistantMessage, setLastAssistantMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const onCallEndRef = useRef(onCallEnd);
  const lastAssistantMessageRef = useRef("");
  const callIdRef = useRef<string | null>(null);
  onCallEndRef.current = onCallEnd;

  // Detect Vapi config on client after mount (env vars are inlined at build time)
  useEffect(() => {
    const { publicKey, assistantId } = getVapiConfig();
    setIsConfigured(Boolean(publicKey && assistantId));
  }, []);

  // Suppress Krisp WASM_OR_WORKER_NOT_READY unload errors (thrown asynchronously by Vapi SDK)
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const msg = (e.reason?.message ?? String(e.reason ?? "")).toLowerCase();
      if (msg.includes("wasm_or_worker_not_ready") || msg.includes("krisp")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  useEffect(() => {
    const { publicKey, assistantId } = getVapiConfig();
    if (!publicKey || !assistantId) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    const handleMessage = (message: Record<string, unknown>) => {
        const type = String(message?.type ?? message?.messageType ?? "").toLowerCase();
        const text = String(
          message.transcript ?? message.transcription ?? message.text ?? ""
        ).trim();
        const role = String(
          message.role ?? message.speaker ?? message.participant ?? ""
        ).toLowerCase();
        if (!text) return;
        const isUser =
          role === "user" ||
          role === "customer" ||
          role === "human" ||
          (type === "transcript" && role !== "assistant" && role !== "agent" && role !== "ai");
        const isAssistant = role === "assistant" || role === "agent" || role === "ai";
        if (isUser) setUserTranscript(text);
        if (isAssistant) {
          lastAssistantMessageRef.current = text;
          setLastAssistantMessage(text);
        }
      };

    const handleSpeechStart = () => setIsAssistantSpeaking(true);
    const handleSpeechEnd = () => setIsAssistantSpeaking(false);

    const handleCallStart = (payload?: { call?: { id?: string }; id?: string }) => {
      setError(null);
      setIsCallActive(true);
      setIsAssistantSpeaking(false);
      setUserTranscript("");
      lastAssistantMessageRef.current = "";
      setLastAssistantMessage("");
      const id = payload?.call?.id ?? payload?.id ?? (payload as unknown as { callId?: string })?.callId;
      if (id) callIdRef.current = id;
    };

    const handleCallEnd = () => {
      setIsCallActive(false);
      const callId = callIdRef.current ?? undefined;
      callIdRef.current = null;
      onCallEndRef.current?.({
        fromLiveCall: true,
        lastAssistantMessage: lastAssistantMessageRef.current,
        callId,
      });
    };

    const handleError = (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
      setIsCallActive(false);
    };

    const handleCallStartFailed = (event: { error?: string; stage?: string }) => {
      setError(event?.error ?? "Call failed to start. Check your assistant and connection.");
      setIsCallActive(false);
    };

    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("message", handleMessage);
    vapi.on("error", handleError);
    vapi.on("call-start-failed", handleCallStartFailed);

    return () => {
      vapi.removeAllListeners("speech-start");
      vapi.removeAllListeners("speech-end");
      vapi.removeAllListeners("call-start");
      vapi.removeAllListeners("call-end");
      vapi.removeAllListeners("message");
      vapi.removeAllListeners("error");
      vapi.removeAllListeners("call-start-failed");
      // Stop any active call first so Krisp/WASM can tear down. Ignore unload errors
      // (WASM_OR_WORKER_NOT_READY) that occur when the processor isn't ready yet.
      void vapi.stop().catch((_err: unknown) => {
        // Suppress Krisp WASM/worker not ready errors during teardown; don't setState in cleanup
      });
      // Defer clearing the ref so internal Krisp cleanup can finish before instance is dropped
      setTimeout(() => {
        vapiRef.current = null;
      }, 150);
    };
  }, []);

  const startCall = useCallback(async () => {
    const { assistantId } = getVapiConfig();
    if (!vapiRef.current || !assistantId) {
      setError("Vapi not configured. Add NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID to .env.local in the my-app folder.");
      return;
    }
    setError(null);
    setUserTranscript("");
    setLastAssistantMessage("");
    try {
      const result = await vapiRef.current.start(assistantId, {
        variableValues: { language },
      });
      const id = (result as { id?: string; callId?: string })?.id ?? (result as { id?: string; callId?: string })?.callId;
      if (id) callIdRef.current = id;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [language]);

  const endCall = useCallback(async () => {
    if (!vapiRef.current) return;
    try {
      await vapiRef.current.stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return {
    isConfigured,
    startCall,
    endCall,
    isCallActive,
    isAssistantSpeaking,
    userTranscript,
    lastAssistantMessage,
    error,
  };
}
