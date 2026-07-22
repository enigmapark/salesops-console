-- SalesOps Console — Supabase 초기 설정
-- Supabase 대시보드 > SQL Editor에 붙여넣고 "Run" 실행

-- 1) 앱 데이터 저장 테이블 (단일 공유 상태를 JSON으로 보관)
create table if not exists app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 초기 행 (비어 있는 상태로 시작 — 실데이터는 앱이 채움)
insert into app_state (id, data) values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- 2) RLS: 로그인한 사용자만 읽기/쓰기 (익명 접근 차단)
alter table app_state enable row level security;

drop policy if exists "authenticated read" on app_state;
drop policy if exists "authenticated update" on app_state;
drop policy if exists "authenticated insert" on app_state;

create policy "authenticated read" on app_state
  for select to authenticated using (true);
create policy "authenticated update" on app_state
  for update to authenticated using (true) with check (true);
create policy "authenticated insert" on app_state
  for insert to authenticated with check (true);

-- 3) 실시간(다른 기기 변경 즉시 반영)을 위한 publication 등록
alter publication supabase_realtime add table app_state;
