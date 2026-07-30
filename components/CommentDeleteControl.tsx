"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getUserDictionary, type UserLocale } from "@/lib/i18n";

export function CommentDeleteControl({ commentId, locale }: { commentId: string; locale: UserLocale }) {
  const router = useRouter();
  const copy = getUserDictionary(locale);
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
        body: JSON.stringify({ password, locale }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? copy.deletion.submitError);
      }

      setOpen(false);
      setPassword("");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : copy.deletion.submitError);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="comment-delete-control">
      <button className="comment-delete-button" type="button" onClick={() => setOpen((value) => !value)}>
        {copy.common.delete}
      </button>
      {open ? (
        <div className="delete-inline">
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.form.passwordPlaceholder}
          />
          <button className="button" type="button" disabled={pending} onClick={deleteComment}>
            {pending ? copy.deletion.pending : copy.common.delete}
          </button>
        </div>
      ) : null}
      {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
    </div>
  );
}
