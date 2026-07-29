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

const phoneDigitsExpr = `
  regexp_replace(
    case
      when regexp_replace(coalesce(target_normalized, ''), '\\D', '', 'g') like '856%'
        then substr(regexp_replace(coalesce(target_normalized, ''), '\\D', '', 'g'), 4)
      else regexp_replace(coalesce(target_normalized, ''), '\\D', '', 'g')
    end,
    '^0(?=\\d{6,}$)',
    ''
  )
`;

const accountDigitsExpr = `
  case
    when coalesce(target_normalized, '') like 'qr:%' then coalesce(target_normalized, '')
    else regexp_replace(coalesce(target_normalized, ''), '[^\\d]', '', 'g')
  end
`;

const phoneDisplayExpr = `
  case
    when length(normalized) = 10 and (normalized like '20%' or normalized like '30%')
      then substr(normalized, 1, 2) || ' ' || substr(normalized, 3, 4) || ' ' || substr(normalized, 7)
    when length(normalized) = 8
      then substr(normalized, 1, 2) || ' ' || substr(normalized, 3, 3) || ' ' || substr(normalized, 6)
    when length(normalized) = 7
      then substr(normalized, 1, 2) || ' ' || substr(normalized, 3, 3) || ' ' || substr(normalized, 6)
    else normalized
  end
`;

const accountDisplayExpr = `
  case
    when normalized like 'qr:%' then 'QR 등록 건'
    when length(normalized) >= 9
      then substr(normalized, 1, 3) || ' ' || substr(normalized, 4, 3) || ' ' || substr(normalized, 7)
    else normalized
  end
`;

await client.connect();

try {
  await client.query("begin");

  await client.query(`
    create table if not exists public.votes (
      id bigint generated always as identity primary key,
      target_type text not null check (target_type in ('phone', 'bank_account')),
      target_normalized text not null,
      target_display text not null,
      vote text not null check (vote in ('spam', 'safe')),
      ip_hash text not null,
      encrypted_ip text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await client.query(`
    create unique index if not exists votes_identity_target_idx
      on public.votes (target_type, target_normalized, ip_hash);
  `);
  await client.query(`
    create index if not exists votes_lookup_idx
      on public.votes (target_type, target_normalized, vote);
  `);

  const normalizeCommentsResult = await client.query(`
    with normalized_rows as (
      select
        id,
        target_type,
        case
          when target_type = 'phone' then ${phoneDigitsExpr}
          else ${accountDigitsExpr}
        end as normalized
      from public.evaluations
      where btrim(coalesce(comment, '')) <> ''
    ),
    mapped as (
      select
        id,
        normalized,
        case
          when target_type = 'phone' then ${phoneDisplayExpr}
          else ${accountDisplayExpr}
        end as display
      from normalized_rows
    )
    update public.evaluations e
    set
      target_normalized = mapped.normalized,
      target_display = mapped.display,
      updated_at = now()
    from mapped
    where e.id = mapped.id
      and (e.target_normalized is distinct from mapped.normalized or e.target_display is distinct from mapped.display)
  `);

  const migrateVotesResult = await client.query(`
    with vote_rows as (
      select
        id,
        target_type,
        case
          when target_type = 'phone' then ${phoneDigitsExpr}
          else ${accountDigitsExpr}
        end as normalized,
        evaluation as vote,
        coalesce(nullif(ip_hash, ''), nullif(encrypted_ip, ''), 'legacy-' || id::text) as identity_key,
        encrypted_ip,
        status,
        created_at
      from public.evaluations
      where btrim(coalesce(comment, '')) = ''
    ),
    mapped as (
      select
        id,
        target_type,
        normalized,
        case
          when target_type = 'phone' then ${phoneDisplayExpr}
          else ${accountDisplayExpr}
        end as display,
        vote,
        identity_key,
        encrypted_ip,
        status,
        created_at
      from vote_rows
    ),
    latest as (
      select distinct on (target_type, normalized, identity_key)
        target_type,
        normalized,
        display,
        vote,
        identity_key,
        encrypted_ip,
        status,
        created_at
      from mapped
      order by target_type, normalized, identity_key, id desc
    )
    insert into public.votes (
      target_type,
      target_normalized,
      target_display,
      vote,
      ip_hash,
      encrypted_ip,
      created_at,
      updated_at
    )
    select
      target_type,
      normalized,
      display,
      vote,
      identity_key,
      encrypted_ip,
      created_at,
      now()
    from latest
    where status = 'visible'
    on conflict (target_type, target_normalized, ip_hash)
    do update set
      target_display = excluded.target_display,
      vote = excluded.vote,
      encrypted_ip = excluded.encrypted_ip,
      updated_at = now()
  `);

  const deleteVoteRowsResult = await client.query(`
    delete from public.evaluations
    where btrim(coalesce(comment, '')) = ''
  `);

  await client.query("commit");

  console.log(
    JSON.stringify(
      {
        commentEvaluationsNormalized: normalizeCommentsResult.rowCount ?? 0,
        votesUpserted: migrateVotesResult.rowCount ?? 0,
        voteRowsRemovedFromEvaluations: deleteVoteRowsResult.rowCount ?? 0,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query("rollback");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
