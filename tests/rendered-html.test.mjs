import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Lao Safe home page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Lao Safe \| 라오스 전화번호·계좌번호 조회<\/title>/i);
  assert.match(html, /laosafe-logo\.png/);
  assert.match(html, /alt="Lao Safe"/);
  assert.match(html, /모르는 번호, 더콜에서 확인하세요/);
  assert.match(html, /전화번호 검색/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("renders guide and admin routes without the starter marker", async () => {
  const [guideResponse, adminResponse, page, layout, packageJson] = await Promise.all([
    render("/guide"),
    render("/admin"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  const guideHtml = await guideResponse.text();

  assert.match(guideHtml, /이용 안내/);
  assert.equal(adminResponse.status, 307);
  assert.equal(adminResponse.headers.get("location"), "http://localhost/admin/login");
  assert.match(page, /SearchTabs/);
  assert.match(layout, /Lao Safe/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
