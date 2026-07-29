"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommentDeleteControl({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteComment() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/evaluations/${commentId}`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "삭제하지 못했습니다.");
      }

      setOpen(false);
      setPassword("");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "삭제하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="comment-delete-control">
      <button className="comment-delete-button" type="button" onClick={() => setOpen((value) => !value)}>
        삭제
      </button>
      {open ? (
        <div className="delete-inline">
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="등록 시 입력한 비밀번호"
          />
          <button className="button" type="button" disabled={pending} onClick={deleteComment}>
            {pending ? "삭제 중..." : "삭제 확인"}
          </button>
        </div>
      ) : null}
      {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
    </div>
  );
}
