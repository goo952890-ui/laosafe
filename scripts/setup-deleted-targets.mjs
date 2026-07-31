import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("DATABASE_URL을 찾을 수 없습니다.");
  }

  const contents = fs.readFileSync(envPath, "utf8");
  const line = contents
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("DATABASE_URL="));

  if (!line) {
    throw new Error(".env.local에 DATABASE_URL이 없습니다.");
  }

  return line.slice("DATABASE_URL=".length).trim().replace(/^['"]|['"]$/g, "");
}

const sql = `
create table if not exists public.deleted_targets (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('phone', 'bank_account')),
  target_normalized text not null,
  target_display text not null,
  evaluation text check (evaluation in ('spam', 'safe')),
  first_comment text not null default '',
  reported_at timestamptz,
  deleted_at timestamptz not null default now(),
  archived_payload jsonb not null default '{}'::jsonb
);

create index if not exists deleted_targets_lookup_idx
  on public.deleted_targets (target_type, target_normalized, deleted_at desc);
`;

const client = new Client({
  connectionString: readDatabaseUrl(),
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query(sql);
await client.end();

console.log("deleted_targets 테이블 준비 완료");
