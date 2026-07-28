"use client";

import jsQR from "jsqr";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { extractAccountFromQrPayload, formatAccountDisplay } from "@/lib/site-utils";

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

    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await loadImage(imageUrl);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas 컨텍스트를 만들 수 없습니다.");
      }

      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (!code?.data) {
        setScanState({
          kind: "error",
          message:
            "QR코드는 인식했지만 계좌번호를 확인하지 못했습니다. 다른 이미지를 업로드하거나 계좌번호를 직접 입력해 주세요.",
        });
        return;
      }

      const extracted = extractAccountFromQrPayload(code.data);

      if (!extracted) {
        setScanState({
          kind: "error",
          message:
            "QR코드에서 계좌번호를 확인하지 못했습니다. 다른 이미지를 업로드하거나 계좌번호를 직접 입력해 주세요.",
        });
        return;
      }

      setScanState({ kind: "success", account: extracted });
    } catch {
      setScanState({
        kind: "error",
        message:
          "이미지를 처리하는 중 문제가 발생했습니다. 다른 이미지를 업로드하거나 계좌번호를 직접 입력해 주세요.",
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
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
              계좌번호를 확인했습니다.
              <br />
              <strong>{formatAccountDisplay(scanState.account)}</strong>
              <br />이 계좌번호의 평가를 확인합니다.
            </div>
            <div className="button-row">
              <button
                className="button"
                onClick={() => router.push(`/lookup/account/${scanState.account}`)}
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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
