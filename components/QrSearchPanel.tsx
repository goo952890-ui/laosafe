"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { scanQrPayloadFromFile } from "@/lib/qr-scan-client";
import { formatAccountDisplay } from "@/lib/site-utils";

type ScanState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "success"; account: string }
  | { kind: "error"; message: string };

export function QrSearchPanel() {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>({ kind: "idle" });

  async function onFileChange(file: File | null) {
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

      setScanState({ kind: "success", account: payload });
    } catch {
      setScanState({
        kind: "error",
        message:
          "이미지를 처리하는 중 문제가 발생했습니다. 다른 이미지를 업로드하거나 계좌번호를 직접 입력해 주세요.",
      });
    }
  }

  return (
    <>
      <p className="tab-copy">
        송금 QR코드 이미지를 업로드하면 계좌번호를 확인합니다. 계좌번호가 명확하지 않으면
        임의 추정 없이 검색을 중단합니다.
      </p>
      <div className="field-stack">
        <input
          className="input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />

        {scanState.kind === "working" && (
          <div className="qr-result">QR코드를 분석하는 중입니다.</div>
        )}

        {scanState.kind === "success" && (
          <div className="field-stack">
            <div className="qr-result">
              QR코드 텍스트를 확인했습니다.
              <br />
              <strong>{formatAccountDisplay(scanState.account)}</strong>
              <br />이 내용으로 등록된 제보를 확인합니다.
            </div>
            <div className="button-row">
              <button
                className="button"
                onClick={() => router.push(`/lookup/account/${encodeURIComponent(`qr:${scanState.account}`)}`)}
              >
                검색 결과 보기
              </button>
            </div>
          </div>
        )}

        {scanState.kind === "error" && <div className="alert">{scanState.message}</div>}
      </div>
    </>
  );
}
