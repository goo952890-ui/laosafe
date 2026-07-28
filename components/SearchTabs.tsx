"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { normalizeAccount, normalizePhone } from "@/lib/site-utils";
import { QrSearchPanel } from "./QrSearchPanel";

type TabKey = "phone" | "account" | "qr";

export function SearchTabs() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("phone");
  const [phone, setPhone] = useState("");
  const [account, setAccount] = useState("");

  function goToLookup(kind: "phone" | "account", value: string) {
    const normalized =
      kind === "phone" ? normalizePhone(value) : normalizeAccount(value);

    if (!normalized) return;
    router.push(`/lookup/${kind}/${encodeURIComponent(value)}`);
  }

  return (
    <section className="search-panel hero-card" aria-labelledby="lookup-panel-title">
      <div className="tabs" role="tablist" aria-label="검색 방식">
        <button
          className={`tab-button ${tab === "phone" ? "is-active" : ""}`}
          onClick={() => setTab("phone")}
          role="tab"
          aria-selected={tab === "phone"}
        >
          전화번호 검색
        </button>
        <button
          className={`tab-button ${tab === "account" ? "is-active" : ""}`}
          onClick={() => setTab("account")}
          role="tab"
          aria-selected={tab === "account"}
        >
          계좌번호 검색
        </button>
        <button
          className={`tab-button ${tab === "qr" ? "is-active" : ""}`}
          onClick={() => setTab("qr")}
          role="tab"
          aria-selected={tab === "qr"}
        >
          QR코드 검색
        </button>
      </div>

      {tab === "phone" && (
        <>
          <p className="tab-copy">
            라오스 전화번호를 입력하면 다른 사용자가 남긴 평가와 최근 의견을 확인합니다.
          </p>
          <div className="field-stack">
            <input
              className="input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="전화번호를 입력하세요. 예: 020 5555 1234"
            />
            <div className="button-row">
              <button className="button" onClick={() => goToLookup("phone", phone)}>
                검색
              </button>
              <button
                className="button-secondary"
                onClick={() => setPhone("+856 20 5555 1234")}
              >
                예시 채우기
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "account" && (
        <>
          <p className="tab-copy">
            은행 선택 없이 계좌번호만 입력합니다. 공백과 하이픈은 자동으로 정리합니다.
          </p>
          <div className="field-stack">
            <input
              className="input"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              placeholder="계좌번호를 입력하세요. 예: 010-123-456789"
            />
            <div className="button-row">
              <button className="button" onClick={() => goToLookup("account", account)}>
                검색
              </button>
              <button
                className="button-secondary"
                onClick={() => setAccount("010 123 456789")}
              >
                예시 채우기
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "qr" && <QrSearchPanel />}
    </section>
  );
}
