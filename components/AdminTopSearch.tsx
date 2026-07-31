"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminTopSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit() {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/admin/search/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      className="admin-app-search"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        className="admin-app-search-input"
        placeholder="번호 또는 QR 원문 검색"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button className="admin-app-search-button" type="submit">
        검색
      </button>
    </form>
  );
}
