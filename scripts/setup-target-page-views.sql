create table if not exists public.target_view_stats (
  target_key text primary key,
  target_type text not null check (target_type in ('phone', 'bank_account')),
  target_normalized text not null,
  total_views bigint not null default 0,
  last_viewed_at timestamptz
);

create index if not exists idx_target_view_stats_target_type_normalized
  on public.target_view_stats (target_type, target_normalized);

create table if not exists public.site_daily_page_views (
  view_date date primary key,
  page_views bigint not null default 0
);

drop function if exists public.record_target_page_view(text, text, text, text);
drop function if exists public.get_target_view_counts(text[]);
drop function if exists public.increment_target_page_view(text, text, text, text);
drop function if exists public.increment_site_daily_page_view(text, text);
drop function if exists public.get_site_daily_page_views(integer);

do $$
begin
  if to_regclass('public.target_page_views') is not null then
    insert into public.target_view_stats (
      target_key,
      target_type,
      target_normalized,
      total_views,
      last_viewed_at
    )
    select
      target_key,
      min(target_type)::text as target_type,
      min(target_normalized)::text as target_normalized,
      count(*)::bigint as total_views,
      max(created_at) as last_viewed_at
    from public.target_page_views
    group by target_key
    on conflict (target_key)
    do update set
      total_views = excluded.total_views,
      last_viewed_at = excluded.last_viewed_at;

    insert into public.site_daily_page_views (
      view_date,
      page_views
    )
    select
      (created_at at time zone 'Asia/Vientiane')::date as view_date,
      count(*)::bigint as page_views
    from public.target_page_views
    group by (created_at at time zone 'Asia/Vientiane')::date
    on conflict (view_date)
    do update set
      page_views = excluded.page_views;
  end if;
end
$$;

create or replace function public.increment_target_page_view(
  p_target_type text,
  p_target_normalized text,
  p_locale text default null,
  p_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.target_view_stats (
    target_key,
    target_type,
    target_normalized,
    total_views,
    last_viewed_at
  )
  values (
    p_target_type || ':' || p_target_normalized,
    p_target_type,
    p_target_normalized,
    1,
    now()
  )
  on conflict (target_key)
  do update set
    total_views = public.target_view_stats.total_views + 1,
    last_viewed_at = now();
end;
$$;

create or replace function public.increment_site_daily_page_view(
  p_locale text default null,
  p_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_view_date date := (now() at time zone 'Asia/Vientiane')::date;
begin
  insert into public.site_daily_page_views (
    view_date,
    page_views
  )
  values (
    v_view_date,
    1
  )
  on conflict (view_date)
  do update set
    page_views = public.site_daily_page_views.page_views + 1;
end;
$$;

create or replace function public.get_target_view_counts(
  p_target_keys text[] default null
)
returns table (
  target_key text,
  target_type text,
  target_normalized text,
  total_views bigint,
  last_viewed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    v.target_key,
    v.target_type,
    v.target_normalized,
    v.total_views,
    v.last_viewed_at
  from public.target_view_stats v
  where p_target_keys is null or v.target_key = any(p_target_keys)
  order by v.target_key;
$$;

create or replace function public.get_site_daily_page_views(
  p_limit integer default 7
)
returns table (
  view_date text,
  page_views bigint
)
language sql
security definer
set search_path = public
as $$
  select
    to_char(view_date, 'YYYY-MM-DD') as view_date,
    page_views
  from public.site_daily_page_views
  order by view_date desc
  limit greatest(coalesce(p_limit, 7), 1);
$$;
