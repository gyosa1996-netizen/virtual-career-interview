const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const MAX_MESSAGES = 14;
const MAX_JOB_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 1200;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function sanitizeMessages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_MESSAGES);
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks = [];
  for (const item of data?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const part of item?.content ?? []) {
      if (part?.type === "output_text" && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

function buildInstructions(job) {
  return `
당신은 초등학생의 진로 수업을 위한 '가상의 ${job} 직업인' 역할을 맡는다.

[역할]
- 반드시 한국어로, ${job} 종사자의 관점에서 1인칭으로 답한다.
- 실제 특정 인물의 경험담인 것처럼 속이지 않는다. 개인 경험을 묻는 질문에는 '가상의 예'임을 자연스럽게 밝힌다.
- 직업의 업무, 하루 일과, 필요한 역량, 준비 과정, 보람, 어려움, 협업, 진로 조언을 구체적으로 설명한다.
- 초등학교 6학년이 이해할 수 있는 쉬운 표현을 사용한다.
- 한 번의 답변은 보통 2~5문장으로 간결하게 한다. 학생이 더 물어볼 여지를 남긴다.

[정확성]
- 연봉, 취업률, 자격 요건, 시험 제도처럼 시기·지역에 따라 달라지는 사항은 확정적인 최신 수치처럼 꾸며내지 않는다.
- 정확한 최신 통계가 없으면 '기관·경력·지역에 따라 다르다'고 설명하고, 필요하면 공식 진로·자격 정보 확인을 권한다.
- 직업 내부에서도 담당 분야에 따라 업무가 다를 수 있음을 필요할 때 알려 준다.

[학생 보호]
- 학생의 이름, 연락처, 학교명, 주소 등 개인정보를 요구하지 않는다.
- 위험하거나 불법적인 행동의 구체적 방법은 설명하지 않는다. 직업 이해에 필요한 안전한 수준으로만 설명한다.
- 공격적이거나 부적절한 질문이 나오면 꾸짖지 말고 직업 면담 주제로 짧게 되돌린다.

[대화 방식]
- 학생 질문에 먼저 직접 답한다.
- 필요하면 마지막에 짧은 후속 질문 1개를 제안할 수 있다.
- 과장된 감탄, 이모지, 인터넷 은어를 사용하지 않는다.
`.trim();
}

async function fetchWithTimeout(url, options, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function moderate(text) {
  try {
    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/moderations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
      },
      15000
    );

    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data?.results?.[0]?.flagged);
  } catch (_) {
    return false;
  }
}

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return json({ error: "POST 요청만 지원합니다." }, 405);
  }

  if (!OPENAI_API_KEY) {
    return json(
      { error: "Netlify 환경변수 OPENAI_API_KEY가 설정되지 않았습니다." },
      500
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, 400);
  }

  const job = typeof body?.job === "string"
    ? body.job.trim().slice(0, MAX_JOB_LENGTH)
    : "";
  const messages = sanitizeMessages(body?.messages);
  const latestUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content || "";

  if (!job) return json({ error: "직업 정보가 없습니다." }, 400);
  if (!latestUserMessage) return json({ error: "학생 질문이 없습니다." }, 400);

  if (await moderate(latestUserMessage)) {
    return json({
      reply:
        "그 질문에는 구체적으로 답하기 어렵습니다. 직업의 하는 일, 필요한 능력, 준비 과정, 보람이나 어려움처럼 진로 면담과 관련된 내용으로 질문해 주세요.",
    });
  }

  let openAIResponse;
  try {
    openAIResponse = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: buildInstructions(job),
        input: messages,
        max_output_tokens: 450,
        store: false,
      }),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return json({ error: "AI 응답 시간이 너무 오래 걸렸습니다. 다시 시도해 주세요." }, 504);
    }
    console.error("OpenAI request failed", error);
    return json({ error: "OpenAI 서버에 연결하지 못했습니다." }, 502);
  }

  let responseData = null;
  try {
    responseData = await openAIResponse.json();
  } catch (_) {}

  if (!openAIResponse.ok) {
    console.error("OpenAI API error", openAIResponse.status, responseData);
    if (openAIResponse.status === 401) {
      return json({ error: "OpenAI API 키가 올바른지 확인해 주세요." }, 502);
    }
    if (openAIResponse.status === 429) {
      return json({ error: "OpenAI API 사용량 또는 결제 한도를 확인해 주세요." }, 502);
    }
    return json({ error: `AI 응답 생성 중 오류가 발생했습니다. (${openAIResponse.status})` }, 502);
  }

  const reply = extractResponseText(responseData);
  if (!reply) return json({ error: "AI 응답을 해석하지 못했습니다." }, 502);

  return json({ reply });
};

// 교실 전체가 같은 공인 IP를 공유할 수 있으므로 한도는 넉넉하게 잡았습니다.
// 기기별 40회/시간 제한은 브라우저 app.js에서 별도로 적용합니다.
export const config = {
  path: "/api/career-interview",
  rateLimit: {
    windowLimit: 500,
    windowSize: 180,
    aggregateBy: ["ip", "domain"],
  },
};
