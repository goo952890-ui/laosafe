import fs from "fs/promises";
import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const sql = await fs.readFile(new URL("./setup-target-page-views.sql", import.meta.url), "utf8");

await client.connect();

try {
  await client.query(sql);
  console.log("target_page_views ready");
} finally {
  await client.end();
}
