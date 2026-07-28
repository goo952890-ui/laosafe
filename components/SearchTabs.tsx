"use client";

import jsQR from "jsqr";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  detectLookupKind,
  extractAccountFromQrPayload,
  formatAccountDisplay,
} from "@/lib/site-utils";

type ScanState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "success"; account: string }
  | { kind: "error"; message: string };

export function SearchTabs() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"phone" | "account">("phone");
  const [scanState, setScanState] = useState<ScanState>({ kind: "idle" });

  function submitQuery(value: string) {
    const trimmed = value.trim();

    if (!trimmed) return;
    const kind = mode === "phone" ? detectLookupKind(trimmed) : "account";
    router.push(`/lookup/${kind}/${encodeURIComponent(trimmed)}`);
  }

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

      if (!context) throw new Error("Canvas unavailable");

      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (!code?.data) {
        setScanState({
          kind: "error",
          message:
            "QR코드에서 계좌번호를 확인하지 못했습니다. 다른 이미지를 업로드하거나 계좌번호를 직접 입력해 주세요.",
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
      router.push(`/lookup/account/${encodeURIComponent(code.data)}`);
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
    <section className="search-panel" aria-labelledby="lookup-panel-title">
      <div className="search-mode-tabs" role="tablist" aria-label="조회 유형">
        <button
          className={`search-mode-tab ${mode === "phone" ? "is-active" : ""}`}
          type="button"
          onClick={() => setMode("phone")}
        >
          전화번호 검색
        </button>
        <button
          className={`search-mode-tab ${mode === "account" ? "is-active" : ""}`}
          type="button"
          onClick={() => setMode("account")}
        >
          계좌번호/QR코드 조회
        </button>
      </div>

      <form
        className={`search-form ${mode === "account" ? "search-form--account" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          submitQuery(query);
        }}
      >
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            mode === "phone"
              ? "예) 010-1234-5678 또는 021234567"
              : "예) 010123456789 또는 010-123-456789"
          }
          aria-label="전화번호 또는 계좌번호"
        />
        <button className="search-button" type="submit">
          검색
        </button>
        {mode === "account" ? (
          <button
            className="search-qr-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            QR코드 조회
          </button>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden-file"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
      </form>

      <div className="search-help">
        <span>검색 결과가 없나요? 직접 신고하여 정보를 남겨주세요.</span>
        <span>신고는 익명으로 가능하며 IP 주소는 저장됩니다.</span>
      </div>

      {scanState.kind === "working" ? (
        <p className="inline-notice">QR코드를 분석하는 중입니다.</p>
      ) : null}
      {scanState.kind === "success" ? (
        <p className="inline-notice inline-notice--success">
          QR코드 텍스트를 확인했습니다. {formatAccountDisplay(scanState.account)} 결과를 조회합니다.
        </p>
      ) : null}
      {scanState.kind === "error" ? (
        <p className="inline-notice inline-notice--warning">{scanState.message}</p>
      ) : null}
    </section>
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
