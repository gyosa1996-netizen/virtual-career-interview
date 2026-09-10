# AI 직업인 면담실

초등학교 진로 수업에서 태블릿으로 가상의 직업인과 채팅 면담을 진행하는 웹앱입니다.

## 구조

- **GitHub Pages**: 학생용 화면 (`index.html`, `app.js`, `styles.css`)
- **Supabase Auth**: 태블릿별 익명 사용자 세션
- **Supabase Edge Function**: OpenAI API 키를 숨긴 채 AI 응답 호출
- **Supabase DB**: 대화 내용이 아니라 시간당 호출 횟수만 기록
- **OpenAI Responses API**: 가상 직업인 답변 생성
- **OpenAI Moderation**: 학생 질문의 안전성 1차 확인

학생 대화는 브라우저 `localStorage`에만 저장되며, Supabase DB에는 저장하지 않도록 구성했습니다.

---

## 1. Supabase 프로젝트 준비

1. Supabase 프로젝트를 만듭니다.
2. **Authentication > Providers 또는 Sign In / Providers**에서 **Anonymous Sign-ins**를 활성화합니다.
3. SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.

> `ai_usage` 테이블은 호출 제한용입니다. RLS를 켜고 일반 클라이언트 정책을 만들지 않았기 때문에 브라우저에서 직접 읽거나 쓸 수 없습니다.

---

## 2. OpenAI API 키를 Supabase에 저장

OpenAI API 키를 웹페이지의 `config.js`에 넣으면 안 됩니다.

Supabase Dashboard의 **Edge Function Secrets**에 아래 값을 추가합니다.

- `OPENAI_API_KEY` = 본인의 OpenAI API 키
- `OPENAI_MODEL` = `gpt-5.6-luna` (선택 사항, 생략 시 이 값 사용)

CLI를 쓴다면 예시는 다음과 같습니다.

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-5.6-luna
```

---

## 3. Edge Function 배포

프로젝트 루트에서 Supabase CLI를 사용하는 경우:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy career-interview
```

배포 후 Supabase Dashboard의 **Functions > career-interview > Logs**에서 오류를 확인할 수 있습니다.

`supabase/config.toml`에는 JWT 검증이 켜져 있습니다. 학생 브라우저는 Supabase의 익명 로그인으로 발급받은 사용자 JWT를 사용합니다.

---

## 4. 웹페이지 연결

`config.js`를 열어 두 값을 수정합니다.

```js
export const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
```

Supabase Dashboard의 **Project Settings > API**에서 확인할 수 있습니다.

Publishable key는 브라우저에서 사용하도록 설계된 키입니다. **OpenAI API 키나 Supabase Secret key는 절대 넣지 마세요.**

---

## 5. GitHub Pages 배포

1. 새 GitHub 저장소를 만듭니다.
2. 이 폴더 전체를 업로드합니다.
3. GitHub 저장소의 **Settings > Pages**로 갑니다.
4. 배포 소스를 `Deploy from a branch`로 선택합니다.
5. `main` / `(root)`를 선택하여 저장합니다.
6. 생성된 GitHub Pages 주소를 학생 태블릿에서 엽니다.

`supabase` 폴더가 함께 공개되어도 OpenAI 키는 들어 있지 않기 때문에 괜찮습니다. 실제 비밀키는 Supabase의 Secret에만 저장됩니다.

---

## 수업에서 사용할 때

### 기본 흐름

1. 학생이 직업 카드를 선택합니다.
2. 추천 질문 또는 직접 입력으로 면담을 시작합니다.
3. 후속 질문을 이어 갑니다.
4. `면담 기록 복사`를 눌러 활동지나 문서에 붙여 넣습니다.
5. 다른 직업을 면담하려면 `새 면담`을 누릅니다.

### 기본 제한

- 질문 길이: 최대 500자
- 한 기기/익명 사용자: **1시간 최대 40회** AI 질문
- AI에 전달하는 대화: 최근 14개 메시지
- AI 답변 길이: 최대 450 output tokens

`supabase/functions/career-interview/index.ts`의 아래 값을 수정하면 바꿀 수 있습니다.

```ts
const MAX_CALLS_PER_HOUR = 40;
const MAX_MESSAGES = 14;
```

---

## 개인정보 관련 권장사항

- 학생에게 이름, 전화번호, 학교명, 주소 등 개인정보를 채팅에 입력하지 않도록 안내하세요.
- 이 앱 자체는 학생 이름을 입력받지 않습니다.
- 앱의 대화 기록은 기기의 브라우저 저장소에 남기 때문에 공용 태블릿이라면 수업 후 `새 면담`으로 기록을 삭제하는 것이 좋습니다.
- OpenAI API 요청에는 `store: false`를 사용했습니다. 다만 API 제공자의 안전·보안 목적 처리 및 보존 정책은 별도로 적용될 수 있으므로 학교 차원의 AI 서비스 사용 기준도 함께 확인하세요.

---

## 자주 생기는 오류

### `익명 접속 실패`
Supabase에서 Anonymous Sign-ins가 켜져 있는지 확인하세요.

### `401` 또는 Function 호출 실패
- `supabase/config.toml`의 함수 이름이 `career-interview`인지 확인
- 함수가 정상 배포되었는지 확인
- 브라우저의 `config.js` 값이 해당 Supabase 프로젝트의 URL/Publishable key인지 확인

### CORS 오류
이 함수는 최신 Supabase `withSupabase` 래퍼를 사용해 브라우저 CORS 및 사용자 인증을 처리하도록 작성했습니다. 함수 로그도 함께 확인하세요.

### `서버에 OPENAI_API_KEY가 설정되지 않았습니다.`
Supabase Edge Function Secrets에 `OPENAI_API_KEY`를 추가하세요.

### 학생 여러 명이 동시에 써도 되나요?
가능합니다. 각 기기에서 익명 사용자 세션이 따로 만들어지고, 대화 기록도 각 브라우저에 따로 저장됩니다. 단, OpenAI API 사용량과 Supabase 프로젝트의 사용량 한도는 전체 학생 사용량만큼 증가합니다.
