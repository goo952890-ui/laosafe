"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminTargetVisibilityButton({
  kind,
  normalized,
  hidden,
}: {
  kind: "phone" | "account";
  normalized: string;
  hidden: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      await fetch("/api/admin/targets/visibility", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          normalized,
          status: hidden ? "visible" : "hidden",
        }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="button-secondary" type="button" disabled={pending} onClick={toggle}>
      {pending ? "처리 중..." : hidden ? "번호 다시 표시" : "번호 숨김"}
    </button>
  );
}
