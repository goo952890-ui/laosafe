"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trackDeleteRequestSubmit } from "@/lib/analytics";
import { getUserDictionary, type UserLocale } from "@/lib/i18n";
import { validatePlainText, validateTargetLength } from "@/lib/input-validation";

export function DeletionRequestForm({
  target,
  targetNormalized,
  targetType,
  locale,
  title,
  intro,
  submitLabel,
  defaultReason,
  reasonOptions,
}: {
  target: string;
  targetNormalized?: string;
  targetType: "phone" | "account";
  locale: UserLocale;
  title?: string;
  intro?: string;
  submitLabel?: string;
  defaultReason?: string;
  reasonOptions?: string[];
}) {
  const copy = getUserDictionary(locale);
  const resolvedTitle = title ?? copy.deletion.title;
  const resolvedSubmitLabel = submitLabel ?? copy.deletion.submit;
  const resolvedDefaultReason = defaultReason ?? copy.deletion.reasons[0];
  const options =
    reasonOptions ?? copy.deletion.reasons;
  const [reason, setReason] = useState(resolvedDefaultReason);
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submitRequest() {
    setPending(true);
    setError(null);

    const targetError = validateTargetLength(targetNormalized ?? target, locale);
    if (targetError) {
      setError(targetError);
      setPending(false);
      return;
    }

    const descriptionError = validatePlainText(description, true, locale);
    if (descriptionError) {
      setError(descriptionError);
      setPending(false);
      return;
    }

    const contactError = validatePlainText(contact, true, locale);
    if (contactError) {
      setError(contactError);
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/deletion-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          targetType,
          targetLabel: target,
          targetNormalized,
          reason,
          description,
          contact,
          locale,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? copy.deletion.submitError);
      }

      trackDeleteRequestSubmit({ targetType });
      const summary = description.trim() || reason;
      router.push(
        `/request-delete/complete?type=${encodeURIComponent(targetType)}&target=${encodeURIComponent(target)}&content=${encodeURIComponent(summary)}`,
      );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : copy.deletion.submitError,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel-block" aria-labelledby="deletion-title">
      <h2 className="panel-title" id="deletion-title">
        {resolvedTitle}
      </h2>
      <p className="section-copy">{intro ?? `${target}${copy.deletion.introSuffix}`}</p>
      <div className="field-stack">
        <select className="select" value={reason} onChange={(event) => setReason(event.target.value)}>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <textarea
          className="textarea"
          placeholder={copy.deletion.detailPlaceholder}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <input
          className="input"
          placeholder={copy.deletion.contactPlaceholder}
          value={contact}
          onChange={(event) => setContact(event.target.value)}
        />
        <div className="inline-notice inline-notice--warning">
          {copy.deletion.ipNotice}
        </div>
        <div className="button-row">
          <button className="button" type="button" onClick={submitRequest} disabled={pending}>
            {pending ? copy.deletion.pending : resolvedSubmitLabel}
          </button>
        </div>
        {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
      </div>
    </section>
  );
}
