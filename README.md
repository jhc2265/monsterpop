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

## 로컬 실행
```bash
npm install
cp .env.example .env    # Supabase URL / anon key 입력
npm run dev
```

`.env` 값은 Supabase 프로젝트의 **Project Settings → API** 에서 확인할 수 있습니다.
데이터베이스 스키마는 [`supabase_setup.sql`](supabase_setup.sql) 을 SQL Editor 에 한 번 실행하면 준비됩니다.

## 폴더 구조
```
src/
├─ components/   재사용 컴포넌트 (Icon, MonsterImage, BottomNav, ErrorBoundary …)
├─ context/      AuthContext (로그인 상태)
├─ lib/          supabase · monsters · progression · sound · format
├─ pages/        Hero · Login · Home · Game · Result · Ranking · Collection · Community · PostDetail · Settings
├─ App.jsx       라우팅 + 로그인 보호
└─ main.jsx
public/images/   monsters · bg · ui · ranks · rewards (WebP)
```
