"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EvaluationForm } from "@/components/EvaluationForm";
import { getUserDictionary, type UserLocale } from "@/lib/i18n";
import { scanQrPayloadFromFile } from "@/lib/qr-scan-client";
import {
  formatAccountDisplay,
  formatPhoneDisplay,
  normalizeAccountLookupKey,
  normalizePhone,
} from "@/lib/site-utils";

type ReportTargetKind = "phone" | "account" | "qr";
type ScanState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "success"; payload: string }
  | { kind: "error"; message: string };

export function ReportComposer({
  locale,
  initialQuery = "",
  initialMode = "text",
  hiddenQuery = false,
}: {
  locale: UserLocale;
  initialQuery?: string;
  initialMode?: "text" | "qr";
  hiddenQuery?: boolean;
}) {
  const copy = getUserDictionary(locale);
  const isLockedQuery = initialQuery.length > 0;
  const initialQrPayload =
    initialMode === "qr" && initialQuery.startsWith("qr:") ? formatAccountDisplay(initialQuery) : null;

  const [targetKind, setTargetKind] = useState<ReportTargetKind | null>(
    initialMode === "qr" ? "qr" : isLockedQuery ? "phone" : null,
  );
  const [textValue, setTextValue] = useState(initialMode === "text" ? initialQuery : "");
  const [scanState, setScanState] = useState<ScanState>(
    initialQrPayload ? { kind: "success", payload: initialQrPayload } : { kind: "idle" },
  );

  const target = useMemo(
    () => resolveReportTarget(targetKind, textValue, scanState),
    [targetKind, textValue, scanState],
  );

  async function onQrFileChange(file: File | null) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setScanState({
        kind: "error",
        message: copy.home.qrImageTypeError,
      });
      return;
    }

    setScanState({ kind: "working" });

    try {
      const payload = await scanQrPayloadFromFile(file);

      if (!payload) {
        setScanState({
          kind: "error",
          message: copy.home.qrNotFound,
        });
        return;
      }

      setScanState({ kind: "success", payload });
    } catch {
      setScanState({
        kind: "error",
        message: copy.home.qrError,
      });
    }
  }

  return (
    <section className="request-panel">
      {isLockedQuery ? (
        <div className="field-stack">
          <label className="field-label">{copy.reportComposer.lookedUpNumber}</label>
          <div className="report-target-box">
            <strong>
              {initialMode === "qr"
                ? formatAccountDisplay(initialQuery)
                : targetKind === "account"
                  ? formatAccountDisplay(normalizeAccountLookupKey(textValue))
                  : formatPhoneDisplay(normalizePhone(textValue))}
            </strong>
          </div>
        </div>
      ) : null}

      {!isLockedQuery && targetKind === "phone" ? (
        <div className="field-stack">
          <label className="field-label" htmlFor="report-phone">
            {copy.reportComposer.phoneInput}
          </label>
          <input
            id="report-phone"
            className="input"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder={copy.reportComposer.phonePlaceholder}
          />
        </div>
      ) : null}

      {!isLockedQuery && targetKind === "account" ? (
        <div className="field-stack">
          <label className="field-label" htmlFor="report-account">
            {copy.reportComposer.accountInput}
          </label>
          <input
            id="report-account"
            className="input"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder={copy.reportComposer.accountPlaceholder}
          />
        </div>
      ) : null}

      {!isLockedQuery && targetKind === "qr" ? (
        <div className="field-stack">
          <label className="field-label" htmlFor="report-qr">
            {copy.reportComposer.qrInput}
          </label>
          <input
            id="report-qr"
            className="input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={(event) => onQrFileChange(event.target.files?.[0] ?? null)}
          />
          {scanState.kind === "working" ? (
            <div className="inline-notice">{copy.reportComposer.qrScanning}</div>
          ) : null}
          {scanState.kind === "success" ? (
            <div className="inline-notice inline-notice--success">
              {copy.reportComposer.qrReady}
            </div>
          ) : null}
          {scanState.kind === "error" ? (
            <div className="inline-notice inline-notice--warning">{scanState.message}</div>
          ) : null}
        </div>
      ) : null}

      {target ? (
        <>
          {hiddenQuery ? (
            <div className="result-status-box">
              <p className="body-copy">미노출된 번호입니다. 새 제보는 관리자 검토 후 반영됩니다.</p>
            </div>
          ) : null}
          {!isLockedQuery ? (
            <div className="report-target-box">
              <strong>{target.display}</strong>
            </div>
          ) : null}
          <div className="report-form-section">
            <EvaluationForm
              locale={locale}
              label={copy.common.target}
              title={copy.form.reportTitle}
              submitLabel={copy.form.reportSubmit}
              requireComment
              allowEvaluationChoice
              requireSafeApproval
              safeApprovalNotice={copy.form.safeApproval}
              showIdentityFields={false}
              requirePassword={false}
              submissionType="report"
              targetType={target.kind}
              targetDisplay={target.display}
              targetNormalized={target.normalized}
              qrPayload={target.qrPayload}
              redirectPath={`/lookup/${target.kind}/${encodeURIComponent(target.normalized)}`}
              pendingRedirectPath={`/lookup/${target.kind}/${encodeURIComponent(target.normalized)}?review=safe`}
              topFields={
                <div className="field-stack">
                  <span className="field-label">{copy.common.numberType}</span>
                  <div className="sub-switch report-kind-switch">
                    <button
                      type="button"
                      className={`sub-switch-button ${targetKind === "phone" ? "is-active" : ""}`}
                      onClick={() => setTargetKind("phone")}
                      disabled={initialMode === "qr"}
                    >
                      {copy.reportComposer.phoneInput}
                    </button>
                    <button
                      type="button"
                      className={`sub-switch-button ${targetKind === "account" ? "is-active" : ""}`}
                      onClick={() => setTargetKind("account")}
                      disabled={initialMode === "qr"}
                    >
                      {copy.reportComposer.accountInput}
                    </button>
                    <button
                      type="button"
                      className={`sub-switch-button ${targetKind === "qr" ? "is-active" : ""}`}
                      onClick={() => setTargetKind("qr")}
                      disabled={initialMode === "text" && isLockedQuery}
                    >
                      {copy.reportComposer.qrInput}
                    </button>
                  </div>
                </div>
              }
            />
          </div>
        </>
      ) : (
        <div className="report-empty-box">
          <p className="body-copy">{copy.reportComposer.empty}</p>
          <Link href="/guide" className="detail-action-link">
            {copy.reportComposer.guide}
          </Link>
        </div>
      )}
    </section>
  );
}

function resolveReportTarget(
  targetKind: ReportTargetKind | null,
  textValue: string,
  scanState: ScanState,
) {
  if (targetKind === "phone") {
    const normalized = normalizePhone(textValue);
    if (!normalized) return null;

    return {
      kind: "phone" as const,
      normalized,
      display: formatPhoneDisplay(normalized),
      qrPayload: null,
    };
  }

  if (targetKind === "account") {
    const normalized = normalizeAccountLookupKey(textValue);
    if (!normalized) return null;

    return {
      kind: "account" as const,
      normalized,
      display: formatAccountDisplay(normalized),
      qrPayload: normalized.startsWith("qr:") ? formatAccountDisplay(normalized) : null,
    };
  }

  if (targetKind !== "qr" || scanState.kind !== "success") return null;

  return {
    kind: "account" as const,
    normalized: `qr:${scanState.payload}`,
    display: formatAccountDisplay(`qr:${scanState.payload}`),
    qrPayload: scanState.payload,
  };
}
