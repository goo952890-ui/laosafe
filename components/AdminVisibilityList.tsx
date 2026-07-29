"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminVisibilityList({
  items,
}: {
  items: Array<{ id: number; label: string; status: "visible" | "hidden" | "deleted" }>;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function updateStatus(id: number, status: "visible" | "hidden") {
    setPendingId(id);
    try {
      await fetch(`/api/admin/evaluations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="admin-list">
      {items.map((item) => (
        <div className="admin-card" key={item.id}>
          <strong>{item.label}</strong>
          <p className="meta-copy">현재 상태: {item.status}</p>
          <div className="button-row">
            <button
              className="button-secondary"
              type="button"
              disabled={pendingId !== null}
              onClick={() => updateStatus(item.id, item.status === "hidden" ? "visible" : "hidden")}
            >
              {item.status === "hidden" ? "다시 표시" : "숨김"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
