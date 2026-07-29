"use client";

import { type FormEvent, useState } from "react";

export function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitLogin(event?: FormEvent) {
    event?.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "로그인에 실패했습니다.");
      }

      window.location.href = "/admin";
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "로그인에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="panel-block" aria-labelledby="admin-login-title" onSubmit={submitLogin}>
      <h2 className="panel-title" id="admin-login-title">
        운영자 인증
      </h2>
      <div className="field-stack">
        <label className="field-label" htmlFor="admin-username">
          아이디
        </label>
        <input
          id="admin-username"
          className="input"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
        />
        <label className="field-label" htmlFor="admin-password">
          비밀번호
        </label>
        <input
          id="admin-password"
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
        <div className="button-row">
          <button className="button" type="submit" disabled={pending}>
            {pending ? "확인 중..." : "로그인"}
          </button>
        </div>
        {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
      </div>
    </form>
  );
}
