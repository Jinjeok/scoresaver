# ScoreSaver

음악 악보 관리 웹 서비스. PDF 악보와 음원을 저장/관리하고, 공유 링크를 통해 누구나 열람할 수 있으며, Notion/Memos와 자동 연동됩니다.

**도메인**: `https://sheet.mutsuki.kr`

## 기술 스택

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database / Auth / Storage**: Supabase (PostgreSQL, Google OAuth, Storage)
- **Styling**: Tailwind CSS 4
- **악보 렌더링**: react-pdf (PDF), OpenSheetMusicDisplay (MusicXML)
- **오디오**: HTML5 Audio API, wavesurfer.js
- **배포**: Docker Compose + Caddy, GitHub Actions CI/CD

## 개발 환경 설정

### 사전 요구사항

- Node.js 20+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`npm install -g supabase`)
- Docker (로컬 Supabase 또는 프로덕션 배포용)

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone <repo-url>
cd scoresaver
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 아래 값을 채워 넣으세요:

| 변수 | 설명 | 필수 |
|------|------|:----:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) 키 | O |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role 키 (서버 전용) | O |
| `NEXT_PUBLIC_SITE_URL` | 사이트 URL (로컬: `http://localhost:3000`) | O |
| `NOTION_API_KEY` | Notion Integration Secret | - |
| `NOTION_DATABASE_ID` | Notion 데이터베이스 ID | - |
| `MEMOS_BASE_URL` | Memos 서버 URL | - |
| `MEMOS_ACCESS_TOKEN` | Memos API 토큰 | - |

> Notion/Memos 환경변수가 없으면 해당 연동 기능은 자동으로 비활성화됩니다.

### 3. Supabase 설정

#### 옵션 A: 로컬 Supabase (권장)

```bash
supabase start
```

시작 후 출력되는 `API URL`과 `anon key`, `service_role key`를 `.env.local`에 입력합니다.

#### 옵션 B: 클라우드 Supabase

[Supabase Dashboard](https://supabase.com/dashboard)에서 프로젝트를 생성하고 Settings > API에서 키를 확인합니다.

### 4. 데이터베이스 마이그레이션

Supabase CLI로 마이그레이션을 실행합니다:

```bash
supabase db push
```

또는 Supabase Dashboard의 SQL Editor에서 `supabase/migrations/` 디렉토리의 SQL 파일을 순서대로 실행합니다:

1. `00001_create_profiles.sql` - 사용자 프로필 테이블 + 자동 생성 트리거
2. `00002_create_sheets.sql` - 악보 테이블 + RLS 정책
3. `00003_create_audio_tracks.sql` - 음원 트랙 테이블
4. `00004_create_sync_markers.sql` - 싱크 마커 테이블
5. `00005_create_tags.sql` - 태그 테이블
6. `00006_create_functions.sql` - 공유 토큰 RPC 함수 (SECURITY DEFINER)
7. `00007_create_storage_buckets.sql` - 스토리지 버킷 + 접근 정책
8. `00008_add_musicxml_support.sql` - MusicXML 지원 (musicxml_storage_path 컬럼, musicxml-files 버킷)

### 5. Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 OAuth 2.0 클라이언트를 생성합니다.
2. Authorized redirect URI에 추가:
   - 로컬: `http://localhost:54321/auth/v1/callback`
   - 프로덕션: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
3. Supabase Dashboard > Authentication > Providers > Google에서 Client ID/Secret을 입력합니다.

### 6. 관리자 계정 설정

Google OAuth로 최초 로그인 후, Supabase Dashboard (또는 SQL)에서 해당 사용자의 `is_admin`을 `true`로 설정합니다:

```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'your@email.com';
```

### 7. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000`에서 확인할 수 있습니다.

## 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |
| `npx tsc --noEmit` | TypeScript 타입 체크 |

## 프로젝트 구조

```
scoresaver/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # 공개 페이지 (악보 카탈로그, 상세)
│   │   ├── admin/                    # 관리자 페이지 (CRUD, 연동 관리)
│   │   ├── auth/                     # 인증 (Google OAuth)
│   │   ├── share/[token]/            # 공유 링크 뷰어
│   │   └── api/                      # API 라우트
│   ├── components/
│   │   ├── audio-player/             # 오디오 플레이어
│   │   ├── layout/                   # Header, AdminSidebar
│   │   ├── musicxml-viewer/          # OSMD 기반 MusicXML 뷰어
│   │   ├── pdf-viewer/               # react-pdf 기반 PDF 뷰어
│   │   ├── shared/                   # FileDropzone, ShareLinkCopier
│   │   └── sheet-viewer/             # SheetViewer (PDF/MusicXML 통합), SheetCard
│   ├── lib/
│   │   ├── supabase/                 # Supabase 클라이언트 (client/server/admin/middleware)
│   │   ├── integrations/             # Notion, Memos 연동 서비스
│   │   ├── hooks/                    # useSyncPlayback
│   │   ├── constants/                # 트랙 타입 등
│   │   └── utils/                    # 유틸리티 (validation, storage, format, musicxml)
│   └── types/                        # TypeScript 인터페이스
├── supabase/migrations/              # DB 마이그레이션 SQL
├── Dockerfile                        # 3-stage 빌드 (Node 20 Alpine)
├── docker-compose.yml                # 개발용 Docker Compose
├── docker-compose.prod.yml           # 프로덕션 (GHCR 이미지 + Caddy)
├── Caddyfile                         # 리버스 프록시 설정
└── .github/workflows/deploy.yml      # CI/CD (lint → build → deploy)
```

## 배포

### Docker 로컬 빌드

```bash
docker compose up --build
```

### 프로덕션 배포

GitHub `main` 브랜치에 push하면 자동으로:

1. **lint-and-typecheck**: ESLint + TypeScript 검사
2. **build-and-push**: Docker 이미지 빌드 → GHCR(GitHub Container Registry) push
3. **deploy**: Self-hosted runner에서 `docker compose -f docker-compose.prod.yml up -d` + 헬스체크

필요한 GitHub Secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTION_API_KEY`, `NOTION_DATABASE_ID`
- `MEMOS_BASE_URL`, `MEMOS_ACCESS_TOKEN`

## Supabase Storage 버킷

| 버킷 | 용도 | 경로 패턴 |
|-------|------|-----------|
| `sheet-pdfs` | PDF 악보 및 썸네일 | `{sheet_id}/score.pdf`, `{sheet_id}/thumbnail.png` |
| `audio-files` | 음원 트랙 | `{sheet_id}/{track_id}.mp3` |
| `musicxml-files` | MusicXML 파일 | `{sheet_id}/score.musicxml` |

모든 파일은 비공개이며, Signed URL (1시간 만료)을 통해 접근합니다.
