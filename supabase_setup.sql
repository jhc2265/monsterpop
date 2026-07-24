-- ============================================================
--  AI 몬스터 사냥 랭킹 게임 - Supabase 초기 설정 SQL
--  Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 RUN 하세요.
--  (한 번만 실행하면 됩니다)
-- ============================================================

-- ---------- 1) 프로필 테이블 ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null,
  avatar_url  text,
  xp          integer not null default 0,
  discovered_monsters text[] not null default '{}',
  created_at  timestamptz default now()
);

-- 이미 만들어진 프로젝트에도 성장 필드를 안전하게 추가합니다.
alter table public.profiles add column if not exists xp integer not null default 0;
alter table public.profiles add column if not exists discovered_monsters text[] not null default '{}';

-- ---------- 2) 점수 테이블 ----------
create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  score       integer not null default 0,
  max_combo   integer not null default 0,
  monster_counts jsonb not null default '{}'::jsonb,
  created_at  timestamptz default now()
);
create index if not exists scores_score_idx on public.scores (score desc);
create index if not exists scores_user_idx  on public.scores (user_id);

-- ---------- 3) 게시글 테이블 ----------
create table if not exists public.posts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  content     text not null,
  category    text not null default '자유' check (category in ('공략', '기록 인증', '자유')),
  created_at  timestamptz default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- ---------- 4) 댓글 테이블 ----------
create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  post_id     bigint not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ---------- 5) 게시글 좋아요 ----------
create table if not exists public.post_likes (
  post_id     bigint not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (post_id, user_id)
);

-- ---------- 6) 사용자별 몬스터 처치 기록 ----------
create table if not exists public.user_monster_stats (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  monster_id     text not null,
  kill_count     integer not null default 0,
  last_hunted_at timestamptz default now(),
  primary key (user_id, monster_id)
);

-- 이미 만들어진 프로젝트에도 새 필드를 안전하게 추가합니다.
alter table public.scores add column if not exists monster_counts jsonb not null default '{}'::jsonb;
alter table public.posts add column if not exists category text not null default '자유';

-- ============================================================
--  RLS(행 수준 보안) 활성화 + 정책
--  ※ 이걸 설정하지 않으면 insert/select 가 조용히 실패합니다!
-- ============================================================
alter table public.profiles enable row level security;
alter table public.scores   enable row level security;
alter table public.posts    enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.user_monster_stats enable row level security;

-- 프로필: 누구나 조회 가능(랭킹 닉네임 표시용), 본인 것만 수정
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- 점수: 누구나 조회(랭킹 비교), 본인 것만 저장
drop policy if exists "scores_select_all" on public.scores;
create policy "scores_select_all" on public.scores
  for select using (true);
drop policy if exists "scores_insert_own" on public.scores;
create policy "scores_insert_own" on public.scores
  for insert with check (auth.uid() = user_id);

-- 게시글: 누구나 조회, 로그인 사용자는 작성, 본인 것만 수정/삭제
drop policy if exists "posts_select_all" on public.posts;
create policy "posts_select_all" on public.posts
  for select using (true);
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = user_id);
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update using (auth.uid() = user_id);
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = user_id);

-- 댓글: 누구나 조회, 로그인 사용자는 작성, 본인 것만 삭제
drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all" on public.comments
  for select using (true);
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert with check (auth.uid() = user_id);
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = user_id);

-- 좋아요: 누구나 조회, 본인 좋아요만 추가/삭제
drop policy if exists "post_likes_select_all" on public.post_likes;
create policy "post_likes_select_all" on public.post_likes
  for select using (true);
drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own" on public.post_likes
  for insert with check (auth.uid() = user_id);
drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_delete_own" on public.post_likes
  for delete using (auth.uid() = user_id);

-- 몬스터 기록: 누구나 조회, 본인 기록만 저장/수정
drop policy if exists "monster_stats_select_all" on public.user_monster_stats;
create policy "monster_stats_select_all" on public.user_monster_stats
  for select using (true);
drop policy if exists "monster_stats_insert_own" on public.user_monster_stats;
create policy "monster_stats_insert_own" on public.user_monster_stats
  for insert with check (auth.uid() = user_id);
drop policy if exists "monster_stats_update_own" on public.user_monster_stats;
create policy "monster_stats_update_own" on public.user_monster_stats
  for update using (auth.uid() = user_id);

-- ============================================================
--  회원가입 시 프로필 자동 생성 트리거
--  (닉네임은 가입 시 user_metadata.nickname 값을 사용)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  (선택) 사용자별 최고점 랭킹 뷰 - 필요 시 사용
-- ============================================================
create or replace view public.leaderboard as
select distinct on (s.user_id)
  s.user_id,
  s.score,
  s.max_combo,
  s.created_at,
  p.nickname,
  p.avatar_url
from public.scores s
join public.profiles p on p.id = s.user_id
order by s.user_id, s.score desc;

-- 끝. RUN 후 왼쪽 Table Editor 에서 6개 테이블이 보이면 성공입니다.
