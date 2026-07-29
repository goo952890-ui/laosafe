create table if not exists public.phone_numbers (
  normalized_number text primary key,
  display_number text not null,
  country_code text default '+856',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  normalized_account_number text primary key,
  display_account_number text not null,
  bank_name text,
  recipient_name text,
  masked_recipient_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evaluations (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('phone', 'bank_account')),
  target_normalized text not null,
  target_display text not null,
  evaluation text not null check (evaluation in ('spam', 'safe')),
  comment text not null default '',
  ip_hash text,
  encrypted_ip text,
  user_agent text,
  device_fingerprint text,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evaluations_lookup_idx
  on public.evaluations (target_type, target_normalized, status, created_at desc);

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

create unique index if not exists votes_identity_target_idx
  on public.votes (target_type, target_normalized, ip_hash);

create index if not exists votes_lookup_idx
  on public.votes (target_type, target_normalized, vote);

create table if not exists public.deletion_requests (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('phone', 'bank_account')),
  target_label text not null,
  reason text not null,
  description text not null default '',
  contact text not null default '',
  requester_ip_hash text,
  encrypted_requester_ip text,
  status text not null default 'submitted'
    check (status in ('submitted', 'reviewing', 'resolved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_scans (
  id bigint generated always as identity primary key,
  qr_payload text,
  extracted_account_number text,
  scan_status text not null
    check (scan_status in ('success', 'no_account_found', 'unreadable', 'invalid_image')),
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_stats (
  key text primary key,
  total_reports integer not null default 0,
  safe_targets integer not null default 0,
  spam_targets integer not null default 0,
  today_reports integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.security_logs (
  id bigint generated always as identity primary key,
  log_type text not null
    check (log_type in ('input_validation_failed', 'abnormal_ip_blocked')),
  source text not null
    check (source in ('evaluation', 'deletion_request', 'lookup_rate_limit')),
  target_type text
    check (target_type in ('phone', 'bank_account')),
  target_value text,
  ip text,
  identity_key text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists security_logs_log_type_created_at_idx
  on public.security_logs (log_type, created_at desc);
