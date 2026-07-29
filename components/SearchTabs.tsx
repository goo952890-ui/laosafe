"use client";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  detectLookupKind,
  formatAccountDisplay,
} from "@/lib/site-utils";
import { scanQrPayloadFromFile } from "@/lib/qr-scan-client";

type ScanState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "success"; payload: string }
  | { kind: "error"; message: string };

export function SearchTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [scanState, setScanState] = useState<ScanState>({ kind: "idle" });

  function normalizeSearchInput(value: string) {
    return value.replace(/[^\d]/g, "");
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const allowedControlKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Tab",
      "Home",
      "End",
      "Enter",
    ];

    if (
      allowedControlKeys.includes(event.key) ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  function onSearchPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");

    if (!/^\d+$/.test(pasted)) {
      event.preventDefault();
    }
  }

  function submitQuery(value: string) {
    const trimmed = normalizeSearchInput(value);

    if (!trimmed) return;
    const kind = detectLookupKind(trimmed);
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

    try {
      setScanState({ kind: "working" });
      const payload = await scanQrPayloadFromFile(file);

      if (!payload) {
        setScanState({
          kind: "error",
          message: "이미지에서 QR코드를 찾을 수 없습니다.",
        });
        return;
      }

      setScanState({ kind: "success", payload });
      router.push(`/lookup/account/${encodeURIComponent(`qr:${payload}`)}`);
    } catch {
      setScanState({
        kind: "error",
        message: "이미지를 처리하는 중 문제가 발생했습니다.",
      });
    }
  }

  return (
    <section className="search-panel" aria-labelledby="lookup-panel-title">
      <form
        className="search-form search-form--unified"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuery(query);
        }}
      >
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(normalizeSearchInput(event.target.value))}
          onKeyDown={onSearchKeyDown}
          onPaste={onSearchPaste}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="예) 2055551234 / 010123456789"
          aria-label="전화번호 또는 계좌번호"
        />
        <button className="search-button" type="submit">
          검색
        </button>
        <button
          className={`search-qr-button ${pathname.includes("/lookup/account/qr:") ? "is-active" : ""}`}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          QR코드 조회
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden-file"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
      </form>

      {scanState.kind === "working" ? (
        <p className="inline-notice">QR코드를 분석하는 중입니다.</p>
      ) : null}
      {scanState.kind === "success" ? (
        <p className="inline-notice inline-notice--success">
          {`QR코드 텍스트를 확인했습니다. ${formatAccountDisplay(`qr:${scanState.payload}`)} 결과를 조회합니다.`}
        </p>
      ) : null}
      {scanState.kind === "error" ? (
        <p className="inline-notice inline-notice--warning">{scanState.message}</p>
      ) : null}
      <p className="search-helper-copy">
        번호와 계좌번호는 같은 검색창에서 조회할 수 있고, QR코드 이미지는 바로 계좌 조회로 연결됩니다.
      </p>
    </section>
  );
}
