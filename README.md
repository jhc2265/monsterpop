# MONSTERPOP

30초 안에 몬스터를 사냥해 콤보를 쌓고 랭킹에 도전하는 모바일 웹 게임.

**▶ 플레이:** https://monsterpop.vercel.app

## 기술 스택
- **React + Vite** — 프론트엔드
- **Supabase** — 인증 · 데이터베이스
- **Vercel** — 배포

## 주요 기능
- 30초 리액션 헌팅 — 탭 · 스와이프 · 더블탭 · 홀드로 몬스터 처치
- 콤보 · 점수 계산과 버스트 스킬
- 회원가입 · 로그인 (Supabase Auth)
- 서버 점수 저장 · 헌터 랭킹 (전체 / 오늘 / 주간)
- 레벨 · 성장 시스템과 몬스터 도감
- 커뮤니티 — 글 · 댓글 · 좋아요
- 기기 간 동기화 — 레벨 · 도감 · 오늘의 미션 · 보스 스트릭 · 설정 · 조작 안내가 계정을 따라갑니다

## 로컬 실행
```bash
npm install
cp .env.example .env    # Supabase URL / anon key 입력
npm run dev
```

`.env` 값은 Supabase 프로젝트의 **Project Settings → API** 에서 확인할 수 있습니다.

## 데이터베이스

[`supabase_setup.sql`](supabase_setup.sql) 전체를 Supabase 대시보드의 **SQL Editor** 에 붙여넣고 실행하세요.
`create table if not exists` · `add column if not exists` · `drop policy if exists` 로만 쓰여 있어 **몇 번 실행해도 안전합니다.**

> **처음 한 번만이 아닙니다.** 이 파일에 테이블 · 컬럼 · RLS 정책이 추가될 때마다 **다시 실행해야 합니다.**
> 코드가 쓰는 컬럼이 DB 에 없으면 Postgres 는 에러를 돌려주는데, 그 에러를 놓치면 데이터가 조용히 사라집니다.
> 실제로 `profiles.xp` · `discovered_monsters` 가 없는 상태로 운영되어 모든 성장 기록이 저장되지 않은 적이 있습니다
> (화면은 localStorage 값을 대신 보여줘서 다른 기기로 로그인할 때까지 아무도 몰랐습니다).

실행 후 **Table Editor** 에 테이블 7개가 보이면 정상입니다 —
`profiles` · `scores` · `posts` · `comments` · `post_likes` · `user_monster_stats` · `user_state`.

`user_state` 는 예전에 localStorage 에만 있던 것들을 계정에 묶어 둡니다. `key` 로 종류를 구분합니다:

| key | 내용 | 병합 규칙 |
|---|---|---|
| `missions` | 오늘의 미션 진행도 · 받은 보상 | 같은 날이면 지표는 큰 쪽, 받은 보상은 합집합 |
| `boss` | 오늘 클리어 · 연속 스트릭 · 최고 기록 | 잃지 않는 쪽 (최고 기록은 좋은 쪽) |
| `preferences` | 배경음 · 효과음 · 진동 · 알림 | 마지막에 저장한 쪽 |
| `tutorial` | 조작 안내를 본 버전 | 종류별로 큰 쪽 |

두 기기에서 따로 쌓인 기록은 로그인할 때 병합됩니다. 규칙이 종류마다 다른 이유는
진행도는 줄어들면 안 되고, 설정은 "가장 최근 선택"이 맞기 때문입니다.

## 폰트

본문은 **Pretendard**(가변, 100~900), 표제는 **Paperlogy**, 워드마크는 **Black Han Sans** 입니다.
세 폰트 모두 자체 호스팅합니다 — 구글 폰트를 `@import` 로 불러오면 CSS 파싱이 멈추고
`googleapis`(CSS) → `gstatic`(폰트) 왕복이 연달아 생깁니다.

Pretendard 통짜 파일은 2MB 로, 첫 화면 다운로드의 70% 를 폰트 하나가 차지했습니다.
그래서 `unicode-range` 로 쪼개 `public/fonts/pretendard/` 에 둡니다.
**글자를 빼는 서브셋이 아니라 범위를 나누는 것**이라 어떤 글자도 사라지지 않습니다 —
브라우저가 화면에 실제로 나온 글자의 조각만 받아갑니다. 닉네임에 어떤 한글이 와도 안전합니다.

조각을 다시 만들려면 (`pip install fonttools brotli` 필요):

```bash
python scripts/split-fonts.py
```

`public/fonts/PretendardVariable.woff2` 를 원본으로 조각을 다시 만들고,
`src/index.css` 에 넣을 `@font-face` 블록을 출력합니다. 원본 파일은 지우지 마세요.

## 폴더 구조
```
src/
├─ components/   재사용 컴포넌트 (Icon, Avatar, MonsterImage, BottomNav, ErrorBoundary …)
├─ context/      AuthContext (로그인 상태 · 프로필 복구 · 진행도 동기화)
├─ lib/          supabase · monsters · progression · missions · bosses · sound · format
│                stateCache  서버 상태의 localStorage 캐시 (읽기는 동기, 쓰기는 캐시 후 업로드)
│                syncState   로그인 직후 서버 값과 이 기기 값을 병합
├─ pages/        Hero · Login · Home · Game · Boss · Result · Ranking · Collection · Community · PostDetail · Profile · Settings
├─ App.jsx       라우팅 + 로그인 보호
└─ main.jsx
public/images/   monsters · bg · ui · ranks · ranking · rewards (WebP)
public/audio/    효과음 · 배경음 (MP3)
public/fonts/    Pretendard · Paperlogy (WOFF2)
```
