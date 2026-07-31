"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TargetStatus = "visible" | "hidden" | "deleted";

export function AdminTargetVisibilityButton({
  kind,
  normalized,
  status,
}: {
  kind: "phone" | "account";
  normalized: string;
  status: TargetStatus;
}) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<TargetStatus | null>(null);

  async function updateStatus(nextStatus: TargetStatus) {
    if (pendingStatus) return;

    if (nextStatus === "deleted") {
      const a = Math.floor(Math.random() * 9) + 1;
      const b = Math.floor(Math.random() * 9) + 1;
      const answer = window.prompt(`정말 삭제하시겠습니까?\n확인을 위해 ${a} + ${b} 값을 입력해 주세요.`);

      if (answer === null) return;
      if (Number(answer.trim()) !== a + b) {
        window.alert("숫자 확인값이 올바르지 않아 삭제가 취소되었습니다.");
        return;
      }
    }

    setPendingStatus(nextStatus);

    try {
      const response = await fetch("/api/admin/targets/visibility", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          normalized,
          status: nextStatus,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "상태 변경에 실패했습니다.");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
    } finally {
      setPendingStatus(null);
    }
  }

  const disabled = Boolean(pendingStatus);

  return (
    <div className="admin-visibility-actions">
      <button
        className={`button-secondary button-secondary--success ${status === "visible" ? "is-disabled" : ""}`}
        type="button"
        disabled={disabled || status === "visible"}
        onClick={() => updateStatus("visible")}
      >
        {pendingStatus === "visible" ? "처리 중..." : "노출"}
      </button>
      <button
        className={`button-secondary button-secondary--warning ${status === "hidden" ? "is-disabled" : ""}`}
        type="button"
        disabled={disabled || status === "hidden"}
        onClick={() => updateStatus("hidden")}
      >
        {pendingStatus === "hidden" ? "처리 중..." : "미노출"}
      </button>
      <button
        className="button-secondary button-secondary--danger"
        type="button"
        disabled={disabled}
        onClick={() => updateStatus("deleted")}
      >
        {pendingStatus === "deleted" ? "처리 중..." : "삭제"}
      </button>
    </div>
  );
}
