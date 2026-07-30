"use client";

import { useState } from "react";

import { getUserDictionary, type UserLocale } from "@/lib/i18n";
import {
  validateInquiryEmail,
  validateInquiryMessage,
  validateInquiryName,
} from "@/lib/input-validation";

export function ContactForm({ locale }: { locale: UserLocale }) {
  const copy = getUserDictionary(locale);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submitInquiry() {
    setError(null);
    setSuccess(null);

    const nameError = validateInquiryName(name, locale);
    if (nameError) {
      setError(nameError);
      return;
    }

    const emailError = validateInquiryEmail(email, locale);
    if (emailError) {
      setError(emailError);
      return;
    }

    const messageError = validateInquiryMessage(message, locale);
    if (messageError) {
      setError(messageError);
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
          locale,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? copy.contact.error);
      }

      setName("");
      setEmail("");
      setMessage("");
      setSuccess(copy.contact.success);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.contact.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="request-panel">
      <div className="panel-block">
        <h2 className="panel-title">{copy.contact.panelTitle}</h2>
        <p className="section-copy">{copy.contact.panelCopy}</p>
        <div className="field-stack">
          <input
            className="input"
            placeholder={copy.contact.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="input"
            placeholder={copy.contact.email}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            inputMode="email"
          />
          <textarea
            className="textarea"
            placeholder={copy.contact.message}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="button-row">
            <button className="button" type="button" onClick={submitInquiry} disabled={pending}>
              {pending ? copy.contact.pending : copy.contact.submit}
            </button>
          </div>
          {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
          {success ? <div className="inline-notice inline-notice--success">{success}</div> : null}
        </div>
      </div>
    </section>
  );
}
