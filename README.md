# 🎯 monsterpop — AI 몬스터 사냥 랭킹 게임

30초 안에 몬스터를 사냥해 최고 점수에 도전하는 웹 게임입니다.
회원가입·로그인, 서버 점수 저장, 랭킹 비교, 커뮤니티(글·댓글), 사운드까지
자격증 실기 채점표 항목을 모두 담았습니다.

- 프론트엔드: **React + Vite**
- 서버·DB·인증: **Supabase**
- 배포: **Vercel**

---

## ✅ 채점표 대응표

| 채점 항목 | 배점 | 구현 위치 |
|---|---|---|
| 실제 배포(접속 가능 URL) **필수** | 20 | Vercel 배포 |
| 회원가입 / 로그인(서버 인증) | 15 | `pages/Login.jsx` + Supabase Auth |
| 글쓰기 등 데이터 작성·조회 **필수** | 15 | `pages/Community.jsx` |
| 댓글 등 사용자 상호작용 | 15 | `pages/PostDetail.jsx` |
| 다중 사용자 + 점수 카운트·순위 비교(서버) | 20 | `pages/Ranking.jsx`, `Result.jsx` |
| AI 이미지 생성·활용 | 10 | `public/images/` 에 AI PNG 4장 |
| 사운드(배경음/버튼음)·완성도 | 5 | `lib/sound.js` |

---

## 🚀 배포 순서 (처음부터 끝까지)

### 1. Supabase 새 프로젝트 만들기
1. https://supabase.com 접속 → **New project** 생성 (비밀번호는 잘 저장).
2. 프로젝트가 준비되면 왼쪽 메뉴 **SQL Editor** 로 이동.
3. 이 폴더의 **`supabase_setup.sql`** 파일 내용을 통째로 복사해 붙여넣고 **RUN**.
   → Table Editor 에 `profiles / scores / posts / comments` 4개 테이블이 보이면 성공.

### 2. ⚠️ 이메일 인증 끄기 (중요!)
가입하자마자 바로 로그인되게 하려면:
- **Authentication → Sign In / Providers → Email** 로 이동
- **"Confirm email"** 옵션을 **끄기(OFF)** 후 저장.
- (끄지 않으면 채점자가 회원가입 후 메일 인증을 해야만 로그인됩니다.)

### 3. API 키 복사
- **Project Settings → API** 에서 두 값을 복사:
  - `Project URL`
  - `anon public` key

### 4. 로컬에서 실행해보기 (선택)
```bash
npm install
cp .env.example .env        # 그리고 .env 안의 값을 채움
npm run dev
```
`.env` 예시:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 5. GitHub에 올리기
```bash
git init
git add .
git commit -m "AI 몬스터 사냥 게임"
git branch -M main
git remote add origin https://github.com/본인아이디/저장소이름.git
git push -u origin main
```
> `.env` 는 `.gitignore` 에 포함되어 올라가지 않습니다(정상).

### 6. Vercel 배포
1. https://vercel.com 접속 → GitHub 로그인 → **Add New → Project** → 저장소 선택.
2. Framework Preset 이 **Vite** 로 자동 인식됩니다. 그대로 두기.
3. **Environment Variables** 에 아래 2개 추가:
   - `VITE_SUPABASE_URL` = (Supabase Project URL)
   - `VITE_SUPABASE_ANON_KEY` = (anon public key)
4. **Deploy** 클릭 → 잠시 후 `https://내앱.vercel.app` 주소가 나옵니다.

> 이미 배포한 뒤 환경변수를 추가했다면 **Redeploy** 를 한 번 해줘야 반영됩니다.

### 7. AI 몬스터 이미지 넣기 (10점)
- GPT/DALL·E 등으로 몬스터 4종을 만들어 **배경 투명 PNG** 로 저장.
- `public/images/` 폴더에 아래 이름으로 넣기:
  `slime.png`, `rabbit.png`, `fox.png`, `boss.png`
- 다시 커밋·푸시하면 Vercel이 자동 재배포합니다.
- (이미지가 없어도 컬러 원형+이모지로 정상 작동하니, 배포 먼저 하고 이미지는 나중에 넣어도 됩니다.)

---

## 🧪 제출 전 최종 체크리스트
- [ ] 배포 URL 접속됨
- [ ] 회원가입 → 로그인 됨
- [ ] 새로고침해도 로그인 유지됨
- [ ] 게임 30초 진행 · 점수/콤보 계산됨
- [ ] 게임 종료 후 점수가 **서버에 저장**됨 (다시 접속해도 최고점 유지)
- [ ] **다른 계정**으로 로그인 시 랭킹에 두 사람이 함께 비교됨
- [ ] 게시글 작성·조회됨
- [ ] 댓글 작성됨
- [ ] 모바일 화면 정상
- [ ] 소리(배경음/효과음) 남 — 첫 화면 클릭 이후 재생됨

---

## 🛠 자주 나는 문제 (빠른 해결)
- **화면이 하얗게 뜸** → Vercel 환경변수(`VITE_...`) 누락. 등록 후 Redeploy.
- **가입은 되는데 로그인 안 됨** → 2번(이메일 인증 끄기) 확인.
- **점수/글이 저장 안 됨(에러 없음)** → `supabase_setup.sql` 의 RLS 정책이 실행됐는지 확인.
- **랭킹에 닉네임이 안 보임** → SQL을 다시 RUN(프로필 트리거·외래키 재생성).
- **새로고침 시 404** → `vercel.json` 이 저장소에 포함됐는지 확인(SPA 라우팅).

## 📁 폴더 구조
```
src/
├─ components/   MonsterImage.jsx
├─ context/      AuthContext.jsx (로그인 상태)
├─ lib/          supabase.js, monsters.js, sound.js, format.js
├─ pages/        Login, Home, Game, Result, Ranking, Community, PostDetail
├─ App.jsx       라우팅 + 로그인 보호
└─ main.jsx
supabase_setup.sql   ← Supabase에 한 번 실행
vercel.json          ← 새로고침 404 방지
.env.example         ← 환경변수 예시
```
