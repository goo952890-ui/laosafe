"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EvaluationForm } from "@/components/EvaluationForm";
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
  initialQuery = "",
  initialMode = "text",
  hiddenQuery = false,
}: {
  initialQuery?: string;
  initialMode?: "text" | "qr";
  hiddenQuery?: boolean;
}) {
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
        message: "JPG, JPEG, PNG, WEBP 이미지만 업로드할 수 있습니다.",
      });
      return;
    }

    setScanState({ kind: "working" });

    try {
      const payload = await scanQrPayloadFromFile(file);

      if (!payload) {
        setScanState({
          kind: "error",
          message: "이미지에서 QR코드를 찾을 수 없습니다.",
        });
        return;
      }

      setScanState({ kind: "success", payload });
    } catch {
      setScanState({
        kind: "error",
        message: "이미지를 처리하는 중 문제가 발생했습니다.",
      });
    }
  }

  return (
    <section className="request-panel">
      {isLockedQuery ? (
        <div className="field-stack">
          <label className="field-label">조회한 번호</label>
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
            전화번호
          </label>
          <input
            id="report-phone"
            className="input"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder="예) 2055551234 또는 8562055551234"
          />
        </div>
      ) : null}

      {!isLockedQuery && targetKind === "account" ? (
        <div className="field-stack">
          <label className="field-label" htmlFor="report-account">
            계좌번호
          </label>
          <input
            id="report-account"
            className="input"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder="예) 010123456789"
          />
        </div>
      ) : null}

      {!isLockedQuery && targetKind === "qr" ? (
        <div className="field-stack">
          <label className="field-label" htmlFor="report-qr">
            QR코드 이미지
          </label>
          <input
            id="report-qr"
            className="input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={(event) => onQrFileChange(event.target.files?.[0] ?? null)}
          />
          {scanState.kind === "working" ? (
            <div className="inline-notice">QR코드를 분석하는 중입니다.</div>
          ) : null}
          {scanState.kind === "success" ? (
            <div className="inline-notice inline-notice--success">
              QR코드 텍스트를 확인했습니다. 이 내용으로 제보를 등록할 수 있습니다.
            </div>
          ) : null}
          {scanState.kind === "error" ? (
            <div className="inline-notice inline-notice--warning">{scanState.message}</div>
          ) : null}
        </div>
      ) : null}

      {hiddenQuery ? (
        <div className="result-status-box">
          <p className="body-copy">이 번호는 제보된 번호이나 관리자에 의해 숨김처리된 번호입니다.</p>
          <p className="body-copy">숨김된 번호는 사용자 화면에서 추가 제보를 등록할 수 없습니다.</p>
        </div>
      ) : target ? (
        <>
          {!isLockedQuery ? (
            <div className="report-target-box">
              <strong>{target.display}</strong>
            </div>
          ) : null}
          <div className="report-form-section">
            <EvaluationForm
              label="이 번호"
              title="제보 작성"
              submitLabel="제보하기"
              requireComment
              allowEvaluationChoice
              requireSafeApproval
              safeApprovalNotice="안전번호 제보는 관리자가 검토한 뒤 공식 번호로 확인되는 경우에만 승인됩니다."
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
                  <span className="field-label">번호 유형</span>
                  <div className="sub-switch report-kind-switch">
                    <button
                      type="button"
                      className={`sub-switch-button ${targetKind === "phone" ? "is-active" : ""}`}
                      onClick={() => setTargetKind("phone")}
                      disabled={initialMode === "qr"}
                    >
                      전화번호
                    </button>
                    <button
                      type="button"
                      className={`sub-switch-button ${targetKind === "account" ? "is-active" : ""}`}
                      onClick={() => setTargetKind("account")}
                      disabled={initialMode === "qr"}
                    >
                      계좌번호
                    </button>
                    <button
                      type="button"
                      className={`sub-switch-button ${targetKind === "qr" ? "is-active" : ""}`}
                      onClick={() => setTargetKind("qr")}
                      disabled={initialMode === "text" && isLockedQuery}
                    >
                      QR이미지
                    </button>
                  </div>
                </div>
              }
            />
          </div>
        </>
      ) : (
        <div className="report-empty-box">
          <p className="body-copy">
            전화번호, 계좌번호 또는 QR이미지 유형을 먼저 선택한 뒤 제보 내용을 입력해 주세요.
          </p>
          <Link href="/guide" className="detail-action-link">
            이용 안내 보기
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
