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

insert into public.phone_numbers (normalized_number, display_number)
values
  ('02055551234', '020 5555 1234'),
  ('03077881234', '030 7788 1234')
on conflict (normalized_number) do update
set display_number = excluded.display_number,
    updated_at = now();

insert into public.bank_accounts (
  normalized_account_number,
  display_account_number,
  bank_name,
  recipient_name,
  masked_recipient_name
)
values
  ('010123456789', '010 123 456789', 'BCEL', 'SOMPHONE SHOP', 'SOM***** S***'),
  ('200998877665', '200 998 877665', 'JDB', 'NAKHONE SUP', 'NAK**** S**')
on conflict (normalized_account_number) do update
set display_account_number = excluded.display_account_number,
    bank_name = excluded.bank_name,
    recipient_name = excluded.recipient_name,
    masked_recipient_name = excluded.masked_recipient_name,
    updated_at = now();

insert into public.evaluations (
  target_type,
  target_normalized,
  target_display,
  evaluation,
  comment,
  created_at
)
values
  ('phone', '02055551234', '020 5555 1234', 'spam', '대출 광고와 투자 권유 전화가 하루에 여러 번 왔습니다.', '2026-07-28T09:00:00Z'),
  ('phone', '02055551234', '020 5555 1234', 'spam', '메신저로 송금을 유도한 뒤 계속 다른 번호로 연락했습니다.', '2026-07-27T09:00:00Z'),
  ('phone', '02055551234', '020 5555 1234', 'safe', '한 번은 실제 배달 기사님 번호였지만 이후 광고성 연락도 있었습니다.', '2026-07-25T09:00:00Z'),
  ('phone', '03077881234', '030 7788 1234', 'safe', '예약한 숙소 프런트에서 체크인 확인용으로 연락했습니다.', '2026-07-28T08:30:00Z'),
  ('phone', '03077881234', '030 7788 1234', 'safe', '제가 주문한 물품 배송 관련 정상 연락이었습니다.', '2026-07-24T09:00:00Z'),
  ('bank_account', '010123456789', '010 123 456789', 'spam', '상품 결제 후 판매자와 연락이 끊겼습니다.', '2026-07-28T07:00:00Z'),
  ('bank_account', '010123456789', '010 123 456789', 'spam', '같은 계좌로 선입금을 요구하는 게시글이 반복적으로 올라왔습니다.', '2026-07-26T09:00:00Z'),
  ('bank_account', '010123456789', '010 123 456789', 'safe', '오프라인 매장에서 정상 결제했던 계좌로 확인됩니다.', '2026-07-22T09:00:00Z'),
  ('bank_account', '200998877665', '200 998 877665', 'safe', '소규모 도매 거래에서 여러 번 정상 송금했습니다.', '2026-07-27T07:00:00Z'),
  ('bank_account', '200998877665', '200 998 877665', 'safe', '실매장 결제 계좌로 안내받았고 문제 없이 확인되었습니다.', '2026-07-21T09:00:00Z');

insert into public.deletion_requests (
  target_type,
  target_label,
  reason,
  description,
  contact,
  status,
  created_at
)
values
  ('phone', '020 5555 1234', '전화번호 소유자가 변경됨', '기존 평가가 과거 소유자 기준일 수 있어 검토가 필요합니다.', 'owner@example.com', 'reviewing', '2026-07-28T05:00:00Z'),
  ('bank_account', '010 123 456789', '허위 의견이 등록됨', '실제 거래와 무관한 동일 문구가 반복 등록되었습니다.', 'review@laosafe.app', 'submitted', '2026-07-28T04:00:00Z');
