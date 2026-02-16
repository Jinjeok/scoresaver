# ScoreSaver 외부 서비스 설정 가이드

이 문서는 ScoreSaver에 필요한 외부 서비스 키를 발급받는 방법을 안내합니다.

---

## 1. Supabase 프로젝트 생성 및 키 발급

### 1-1. 프로젝트 생성

1. [supabase.com](https://supabase.com)에 접속하여 GitHub 계정으로 로그인합니다.
2. Dashboard에서 **New Project** 클릭
3. 아래 정보를 입력합니다:
   - **Organization**: 기본 조직 선택 (또는 새로 생성)
   - **Name**: `scoresaver` (자유)
   - **Database Password**: 안전한 비밀번호 입력 (나중에 직접 DB 접속 시 필요)
   - **Region**: `Northeast Asia (Seoul)` 권장
4. **Create new project** 클릭 후 2~3분 대기

### 1-2. API 키 확인

프로젝트 생성 완료 후:

1. 좌측 메뉴 **Settings** > **API Keys** 클릭
2. **Legacy anon, service_role API keys** 탭을 선택합니다:

| 항목 | Supabase 화면 표시 | 환경변수 |
|------|-------------------|----------|
| **anon key** | `eyJhbGci...` (public) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role key** | `eyJhbGci...` (secret) | `SUPABASE_SERVICE_ROLE_KEY` |

> 기본 탭의 새 키(`sb_publishable_`, `sb_secret_`)도 사용 가능하지만, Legacy 키가 `@supabase/supabase-js`와의 호환성이 확실합니다.

3. **Project URL**은 **Settings** > **General** 페이지 상단의 **Reference ID**로 조합합니다:
   ```
   https://<Reference ID>.supabase.co
   ```
   이 값을 `NEXT_PUBLIC_SUPABASE_URL`에 입력합니다.

> **service_role key**는 RLS를 우회하는 관리자 권한 키입니다. **절대 클라이언트에 노출하면 안 됩니다.**

### 1-3. Google OAuth 설정

#### Supabase에서 Callback URL 확인

먼저 Supabase Dashboard에서 Callback URL을 복사해둡니다:

1. Supabase Dashboard > **Authentication** > **Providers** > **Google**
2. **Callback URL**을 복사합니다 (형식: `https://<project-ref>.supabase.co/auth/v1/callback`)

#### Google Auth Platform 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 프로젝트를 선택하거나 새로 생성합니다
3. 좌측 메뉴에서 **Google Auth Platform** 섹션으로 이동합니다
   > 이전에는 "APIs & Services" 아래에 있었으나, 현재는 별도 섹션으로 분리되었습니다.
4. **Branding** (또는 앱 구성) 설정:
   - App name: `ScoreSaver`
   - User support email: 본인 이메일
   - Audience: **External** 선택
5. **Clients** 메뉴에서 OAuth 클라이언트를 생성합니다:
   - **+ Create Client** 클릭
   - Application type: **Web application**
   - Name: `ScoreSaver`
   - **Authorized JavaScript origins**: `http://localhost:3000` (개발용)
   - **Authorized redirect URIs**: 위에서 복사한 Supabase Callback URL 입력
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - **Create** 클릭
6. **Client ID**와 **Client Secret**을 즉시 복사합니다
   > Client Secret은 생성 시에만 확인할 수 있습니다. 반드시 이 시점에 복사하세요.

#### Supabase에 Google OAuth 연결

1. Supabase Dashboard > **Authentication** > **Providers** > **Google**
2. **Enable Sign in with Google** 토글 활성화
3. 위에서 복사한 **Client ID**와 **Client Secret** 입력
4. **Save**

### 1-4. 데이터베이스 마이그레이션

Supabase Dashboard > **SQL Editor**에서 `supabase/migrations/` 폴더의 SQL 파일을 **순서대로** 실행합니다:

```
00001_create_profiles.sql
00002_create_sheets.sql
00003_create_audio_tracks.sql
00004_create_sync_markers.sql
00005_create_tags.sql
00006_create_functions.sql
00007_create_storage_buckets.sql
00008_add_musicxml_support.sql
```

각 파일의 전체 내용을 SQL Editor에 붙여넣고 **Run** 클릭합니다.

또는 Supabase CLI를 사용하는 경우:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### 1-5. 관리자 계정 설정

1. 앱에서 Google 로그인을 한 번 실행합니다 (프로필이 자동 생성됨)
2. Supabase Dashboard > **SQL Editor**에서 실행:

```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'your@email.com';
```

---

## 2. Notion Integration 설정

> 선택 사항. 설정하지 않으면 Notion 연동 기능이 비활성화됩니다.

### 2-1. Integration 생성

1. [Notion Developers](https://www.notion.so/my-integrations)에 접속
2. **+ New integration** 클릭
3. 아래 정보를 입력합니다:
   - **Name**: `ScoreSaver`
   - **Associated workspace**: 사용할 워크스페이스 선택
   - **Type**: Internal
4. **Submit** 클릭
5. **Internal Integration Secret** (`secret_xxx...`)을 복사 → `.env.local`의 `NOTION_API_KEY`에 입력

### 2-2. 데이터베이스 생성 및 연결

1. Notion에서 새 **Full-page database**를 생성합니다
2. 아래 속성(properties)을 추가합니다:

| 속성 이름 | 타입 |
|-----------|------|
| Title | Title (기본) |
| Composer | Rich text |
| Arranger | Rich text |
| Genre | Select |
| Key | Rich text |
| Time Signature | Rich text |
| Tempo (BPM) | Number |
| Pages | Number |
| Public | Checkbox |
| Share Link | URL |
| Audio Tracks | Number |
| Tags | Multi-select |

3. 데이터베이스 페이지에서 우측 상단 **...** > **Connections** > **ScoreSaver** Integration 연결
4. 데이터베이스 URL에서 ID를 복사합니다:
   ```
   https://www.notion.so/your-workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                        이 부분이 DATABASE_ID
   ```
   32자리 hex 문자열을 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` 형식(하이픈 포함)으로 변환하여 `.env.local`의 `NOTION_DATABASE_ID`에 입력합니다.

---

## 3. Memos 연동 설정

> 선택 사항. 설정하지 않으면 Memos 연동 기능이 비활성화됩니다.

### 3-1. Access Token 발급

1. Memos 서버에 로그인합니다
2. **Settings** > **My Account** > **Access Tokens**
3. **Create** 클릭하여 새 토큰을 생성합니다
4. 생성된 토큰을 복사하여 `.env.local`에 입력합니다:
   ```
   MEMOS_BASE_URL=https://your-memos-server.com
   MEMOS_ACCESS_TOKEN=발급받은_토큰
   ```

---

## 4. 최종 .env.local 예시

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Site (필수)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Notion (선택)
NOTION_API_KEY=secret_abc123...
NOTION_DATABASE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Memos (선택)
MEMOS_BASE_URL=https://your-memos.example.com
MEMOS_ACCESS_TOKEN=your_access_token_here
```

설정이 완료되면 `npm run dev`로 개발 서버를 실행합니다.
