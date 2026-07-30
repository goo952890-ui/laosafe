"use client";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { trackLookupSearch } from "@/lib/analytics";
import { getUserDictionary, type UserLocale } from "@/lib/i18n";
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

export function SearchTabs({ locale }: { locale: UserLocale }) {
  const router = useRouter();
  const pathname = usePathname();
  const copy = getUserDictionary(locale);
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
    trackLookupSearch({
      lookupKind: kind,
      queryLength: trimmed.length,
      source: "search_input",
    });
    router.push(`/lookup/${kind}/${encodeURIComponent(trimmed)}`);
  }

  async function onFileChange(file: File | null) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setScanState({
        kind: "error",
        message: copy.home.qrImageTypeError,
      });
      return;
    }

    try {
      setScanState({ kind: "working" });
      const payload = await scanQrPayloadFromFile(file);

      if (!payload) {
        setScanState({
          kind: "error",
          message: copy.home.qrNotFound,
        });
        return;
      }

      setScanState({ kind: "success", payload });
      trackLookupSearch({
        lookupKind: "qr",
        queryLength: payload.length,
        source: "qr_image",
      });
      router.push(`/lookup/account/${encodeURIComponent(`qr:${payload}`)}`);
    } catch {
      setScanState({
        kind: "error",
        message: copy.home.qrError,
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
          placeholder={copy.home.searchPlaceholder}
          aria-label={copy.home.searchAria}
        />
        <button className="search-button" type="submit">
          {copy.common.search}
        </button>
        <button
          className={`search-qr-button ${pathname.includes("/lookup/account/qr:") ? "is-active" : ""}`}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          {copy.common.qrSearch}
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
        <p className="inline-notice">{copy.home.qrScanning}</p>
      ) : null}
      {scanState.kind === "success" ? (
        <p className="inline-notice inline-notice--success">
          {copy.home.qrSuccess}
        </p>
      ) : null}
      {scanState.kind === "error" ? (
        <p className="inline-notice inline-notice--warning">{scanState.message}</p>
      ) : null}
      <p className="search-helper-copy">
        {copy.home.helper}
      </p>
    </section>
  );
}
