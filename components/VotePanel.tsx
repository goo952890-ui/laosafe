"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { trackVoteSubmit } from "@/lib/analytics";
import { getUserDictionary, type UserLocale } from "@/lib/i18n";

export function VotePanel({
  locale,
  targetType,
  targetDisplay,
  targetNormalized,
  qrPayload,
  spamCount,
  safeCount,
}: {
  locale: UserLocale;
  targetType: "phone" | "account";
  targetDisplay: string;
  targetNormalized: string;
  qrPayload?: string | null;
  spamCount: number;
  safeCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const copy = getUserDictionary(locale);
  const [pending, setPending] = useState<"spam" | "safe" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitVote(evaluation: "spam" | "safe") {
    setPending(evaluation);
    setError(null);

    try {
      const voteKey = getClientVoteKey();
      const response = await fetch("/api/evaluations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-laosafe-vote-key": voteKey,
        },
        body: JSON.stringify({
          targetType,
          targetDisplay,
          targetNormalized,
          qrPayload,
          comment: "",
          evaluation,
          locale,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? copy.vote.error);
      }

      trackVoteSubmit({
        targetType: targetType === "account" && qrPayload ? "qr" : targetType,
        evaluation,
      });
      router.replace(pathname);
      router.refresh();
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : copy.vote.error);
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="vote-panel">
      <div className="vote-panel-header">
        <strong>{copy.vote.title}</strong>
      </div>
      <div className="vote-stat-row">
        <button
          className="vote-card danger"
          type="button"
          disabled={pending !== null}
          onClick={() => submitVote("spam")}
        >
          <span className="vote-card-icon" aria-hidden="true">✖</span>
          <span className="vote-card-inline">
            <span className="vote-card-label">{copy.vote.spam}</span>
            <strong>{spamCount}</strong>
          </span>
        </button>
        <button
          className="vote-card safe"
          type="button"
          disabled={pending !== null}
          onClick={() => submitVote("safe")}
        >
          <span className="vote-card-icon" aria-hidden="true">✔</span>
          <span className="vote-card-inline">
            <span className="vote-card-label">{copy.vote.safe}</span>
            <strong>{safeCount}</strong>
          </span>
        </button>
      </div>
      {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
    </section>
  );
}

function getClientVoteKey() {
  if (typeof window === "undefined") {
    return "server";
  }

  const storageKey = "laosafe_vote_key";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(storageKey, created);
  return created;
}
