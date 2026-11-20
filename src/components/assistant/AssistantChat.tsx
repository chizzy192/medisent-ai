"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/strings";
import type { AssistantResponse } from "@/app/api/assistant/route";
import { ListenButton } from "@/components/ListenButton";
import { PhoneIcon } from "@/components/icons";
import { StatusChip } from "@/components/StatusChip";
import { Textarea } from "@/components/forms";
import { useVoice } from "@/lib/speech/useVoice";
import { VoiceInput } from "./VoiceInput";

export type ChatMessage = { id: string; question: string; answer: string; createdAt: string; unsure?: boolean; redFlag?: boolean };

/**
 * Ask assistant (BUILD_PLAN Stage 3, signature element 5): the record answers, in plain
 * English, spoken through the shared player. Mic → transcript (editable) → send. "Try asking"
 * chips for first-time users. A red flag sends the patient to the emergency or helpline screen.
 * "Call my pharmacist" is always on screen.
 */
export function AssistantChat({ history, rate, pharmacistPhone, hospitalName }: { history: ChatMessage[]; rate: number; pharmacistPhone: string | null; hospitalName: string | null }) {
  const t = tr("assistant");
  const router = useRouter();
  const { speak } = useVoice(rate);
  const [messages, setMessages] = useState<ChatMessage[]>(history);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLLIElement>(null);
  const chips = ["food", "missed", "sideEffects"] as const;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setError(null);
    setBusy(true);
    setText("");
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }), signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        setError(navigator.onLine ? "failed" : "offline");
        return;
      }
      const json = (await res.json()) as AssistantResponse;
      if (json.redFlag) {
        router.push(`/redflag?kind=${json.redFlag.kind}&from=assistant`);
        return;
      }
      setMessages((m) => [...m, { id: json.messageId ?? String(Date.now()), question: q, answer: json.answer, createdAt: new Date().toISOString(), unsure: json.unsure }]);
      void speak(json.answer).catch(() => undefined);
    } catch {
      setError(navigator.onLine ? "failed" : "offline");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-3" aria-label={t("historyLabel")}>
        {messages.length === 0 && <li className="rounded-card border border-border bg-surface p-4 text-base text-ink-2">{t("empty")}</li>}
        {messages.map((m) => (
          <li key={m.id} className="space-y-2">
            <p className="ml-6 rounded-card rounded-tr-sm bg-primary-tint p-3 text-base" data-testid="chat-question">
              {m.question}
            </p>
            <div className="mr-6 rounded-card rounded-tl-sm border border-border bg-surface p-3" data-testid="chat-answer">
              <p className="text-lg [overflow-wrap:anywhere]">{m.answer}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ListenButton text={m.answer} rate={rate} />
                {m.unsure && <StatusChip tone="neutral">{t("unsureChip")}</StatusChip>}
              </div>
            </div>
          </li>
        ))}
        {busy && (
          <li className="mr-6 rounded-card border border-border bg-surface p-3" aria-live="polite">
            <StatusChip tone="primary">
              <span className="font-mono">{t("thinking")}</span>
            </StatusChip>
          </li>
        )}
        <li ref={endRef} aria-hidden="true" />
      </ol>

      {messages.length === 0 && (
        <div>
          <p className="label-mono">{t("tryAsking")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button key={c} type="button" onClick={() => ask(t(`chips.${c}`))} disabled={busy} className="btn-outline px-4 text-base" data-testid={`chip-${c}`}>
                {t(`chips.${c}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-button bg-warning-tint p-3 text-base text-warning">
          {t(`errors.${error}`)}
        </p>
      )}

      <form
        className="space-y-3 rounded-card border border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
      >
        <VoiceInput onTranscript={(s) => setText((prev) => (prev ? `${prev} ${s}` : s))} disabled={busy} />
        <label htmlFor="question" className="block text-base font-medium">
          {t("typeLabel")}
        </label>
        <Textarea id="question" value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={500} placeholder={t("placeholder")} data-testid="question" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={busy || !text.trim()} className="btn-primary flex-1 disabled:opacity-60" data-testid="ask-send">
            {t("send")}
          </button>
          {pharmacistPhone ? (
            <a href={`tel:${pharmacistPhone}`} className="btn-outline flex-1" data-testid="call-pharmacist">
              <PhoneIcon size={20} /> {t("callPharmacist")}
            </a>
          ) : (
            <span className="flex min-h-12 flex-1 items-center justify-center text-base text-ink-2">{hospitalName ? t("noPhone", { hospital: hospitalName }) : t("noHospital")}</span>
          )}
        </div>
        <p className="text-sm text-ink-2">{t("disclaimer")}</p>
      </form>
    </div>
  );
}
