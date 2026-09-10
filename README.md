# AI 직업인 면담실 — Netlify 전용 버전

초등학교 진로 수업에서 학생이 태블릿으로 가상의 직업인과 채팅 면담을 진행하는 웹앱입니다.

## 구조

- **Netlify**: 학생용 정적 웹페이지 + 서버리스 Function을 한 사이트에서 제공
- **Netlify Function**: OpenAI API 키를 브라우저에 노출하지 않고 OpenAI Responses API 호출
- **브라우저 localStorage**: 기기별 면담 기록과 간단한 사용량 제한 저장
- **OpenAI Moderation**: 부적절한 질문을 1차 필터링

Supabase는 사용하지 않습니다.

```text
학생 태블릿
   ↓
Netlify 웹페이지
   ↓
/api/career-interview
   ↓
Netlify Function
   ↓
OpenAI API
```

## 파일 구조

```text
virtual-career-interview-netlify/
├─ index.html
├─ styles.css
├─ app.js
├─ netlify.toml
├─ README.md
└─ netlify/
   └─ functions/
      └─ career-interview.mjs
```

## 1. GitHub에 올리기

기존 `virtual-career-interview` 저장소를 그대로 사용해도 됩니다.

1. 기존의 `config.js`와 `supabase/` 폴더는 삭제해도 됩니다.
2. 이 Netlify 버전의 파일을 저장소 루트에 업로드합니다.
3. `netlify/functions/career-interview.mjs`의 폴더 구조가 유지되어야 합니다.
4. Commit 합니다.

## 2. Netlify에서 GitHub 저장소 연결

1. Netlify 로그인
2. **Add new project / Import an existing project**
3. GitHub 선택
4. `virtual-career-interview` 저장소 선택
5. 특별한 Build command는 필요하지 않습니다.
6. Publish directory는 `.` 입니다. `netlify.toml`이 자동으로 설정합니다.
7. Deploy 합니다.

서버리스 Function이 있으므로 단순한 정적 파일 Drag & Drop보다 GitHub 연결 배포를 권장합니다.

## 3. OpenAI API 키 등록

Netlify 프로젝트에서 다음 메뉴로 이동합니다.

**Project configuration → Environment variables**

아래 변수를 추가합니다.

```text
OPENAI_API_KEY = sk-... 또는 sk-proj-...
```

선택 사항:

```text
OPENAI_MODEL = gpt-5.6-luna
```

`OPENAI_MODEL`을 생략하면 코드에서 `gpt-5.6-luna`를 사용합니다.

**OpenAI API 키를 `app.js`, `index.html`, GitHub 저장소에 직접 넣지 마세요.**

환경변수 저장 후 최신 배포를 한 번 다시 실행하면 가장 확실합니다.

## 4. 테스트

Netlify에서 생성된 사이트 주소를 엽니다.

예:

```text
https://사이트이름.netlify.app/
```

직업을 하나 선택하고 질문합니다.

정상 작동하면 브라우저는 같은 Netlify 사이트의 `/api/career-interview`를 호출하고, Netlify Function이 OpenAI API를 호출합니다.

## 기본 제한

- 질문 입력: 최대 500자
- AI 전달 대화: 최근 14개 메시지
- 메시지 한 개: 서버에서 최대 1,200자로 잘라 처리
- 답변: 최대 450 output tokens
- 기기별 소프트 제한: 1시간 40회 (`localStorage` 기반)
- Netlify 서버 측 폭주 방지: 3분당 500회/IP+domain

학교 Wi-Fi에서는 여러 태블릿이 같은 공인 IP를 공유할 수 있기 때문에 Netlify의 IP 기반 한도를 낮게 설정하지 않았습니다.

## 개인정보

- 앱에서 학생 이름, 학교명, 연락처 등을 입력받지 않습니다.
- 면담 내용은 앱 자체 DB에 저장하지 않고 브라우저 `localStorage`에만 보관합니다.
- 공용 태블릿에서는 수업 후 `새 면담`을 눌러 기록을 지우는 것이 좋습니다.
- OpenAI 요청에는 `store: false`를 사용합니다.

## 오류 확인

### `Netlify 환경변수 OPENAI_API_KEY가 설정되지 않았습니다.`
Netlify의 Environment variables에 `OPENAI_API_KEY`를 등록하세요.

### `OpenAI API 키가 올바른지 확인해 주세요.`
등록한 Secret Key가 유효한지 확인하세요.

### `OpenAI API 사용량 또는 결제 한도를 확인해 주세요.`
OpenAI API Platform의 결제/크레딧/사용량 한도를 확인하세요.

### `404`가 뜨는 경우
Netlify 배포 로그에서 `career-interview` Function이 감지됐는지 확인하세요. `netlify/functions/career-interview.mjs` 경로가 정확해야 합니다.

## Supabase 버전과 차이

이 앱은 학생별 계정, 중앙 DB, 실시간 공유가 필요 없어서 Supabase가 없어도 됩니다. 학생들이 각자 독립적으로 AI 면담만 하는 현재 목적에는 Netlify Function 단독 구조가 더 단순합니다.
