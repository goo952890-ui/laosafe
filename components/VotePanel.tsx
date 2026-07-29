"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function VotePanel({
  targetType,
  targetDisplay,
  targetNormalized,
  qrPayload,
  spamCount,
  safeCount,
}: {
  targetType: "phone" | "account";
  targetDisplay: string;
  targetNormalized: string;
  qrPayload?: string | null;
  spamCount: number;
  safeCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
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
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "투표를 등록하지 못했습니다.");
      }

      router.replace(pathname);
      router.refresh();
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "투표를 등록하지 못했습니다.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="vote-panel">
      <div className="vote-panel-header">
        <strong>이 번호는 어떤가요?</strong>
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
            <span className="vote-card-label">스팸</span>
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
            <span className="vote-card-label">안전</span>
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
