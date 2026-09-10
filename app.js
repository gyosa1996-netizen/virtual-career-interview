import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const JOBS = [
  { name: "의사", icon: "🩺", desc: "환자를 진료하고 치료합니다." },
  { name: "간호사", icon: "💉", desc: "환자의 회복과 치료를 돕습니다." },
  { name: "초등학교 교사", icon: "🏫", desc: "학생의 배움과 성장을 돕습니다." },
  { name: "소방관", icon: "🚒", desc: "화재·구조·구급 현장에 출동합니다." },
  { name: "경찰관", icon: "👮", desc: "시민의 안전과 질서를 지킵니다." },
  { name: "변호사", icon: "⚖️", desc: "법률 문제를 해결하도록 돕습니다." },
  { name: "기자", icon: "📰", desc: "사실을 취재하고 기사로 전달합니다." },
  { name: "웹 개발자", icon: "💻", desc: "웹사이트와 서비스를 만듭니다." },
  { name: "AI 연구원", icon: "🤖", desc: "인공지능 기술을 연구하고 개발합니다." },
  { name: "게임 기획자", icon: "🎮", desc: "게임의 규칙·콘텐츠·재미를 설계합니다." },
  { name: "건축가", icon: "🏛️", desc: "건물과 공간을 계획하고 설계합니다." },
  { name: "요리사", icon: "👨‍🍳", desc: "음식을 만들고 주방을 운영합니다." },
  { name: "수의사", icon: "🐾", desc: "동물의 건강을 진료합니다." },
  { name: "항공기 조종사", icon: "✈️", desc: "항공기를 안전하게 운항합니다." },
  { name: "콘텐츠 기획자", icon: "🎬", desc: "영상·온라인 콘텐츠를 기획합니다." },
  { name: "환경 연구원", icon: "🌱", desc: "환경 문제를 조사하고 해결책을 연구합니다." },
  { name: "로봇 엔지니어", icon: "🦾", desc: "로봇을 설계하고 제어 기술을 개발합니다." },
  { name: "심리상담사", icon: "💬", desc: "사람의 고민을 듣고 회복을 돕습니다." },
  { name: "운동선수", icon: "🏅", desc: "훈련과 경기로 기량을 겨룹니다." },
  { name: "공무원", icon: "🏢", desc: "공공서비스와 행정 업무를 담당합니다." },
];

const SUGGESTED_QUESTIONS = [
  "주로 어떤 일을 하나요?",
  "하루 일과는 어떻게 되나요?",
  "이 직업의 가장 좋은 점은 무엇인가요?",
  "가장 힘든 점은 무엇인가요?",
  "어떤 능력이나 성격이 필요한가요?",
  "이 직업을 준비하려면 무엇을 해야 하나요?",
  "학생 때 어떤 경험을 해 보면 좋을까요?",
  "AI가 발전하면 이 직업은 어떻게 달라질까요?",
  "기억에 남는 순간을 가상의 예로 들려주세요.",
  "이 직업을 꿈꾸는 학생에게 조언해 주세요.",
];

const els = {
  setupView: document.querySelector("#setupView"),
  chatView: document.querySelector("#chatView"),
  jobGrid: document.querySelector("#jobGrid"),
  customJob: document.querySelector("#customJob"),
  customJobBtn: document.querySelector("#customJobBtn"),
  restoreBtn: document.querySelector("#restoreBtn"),
  jobAvatar: document.querySelector("#jobAvatar"),
  jobTitle: document.querySelector("#jobTitle"),
  jobSubtitle: document.querySelector("#jobSubtitle"),
  questionChips: document.querySelector("#questionChips"),
  messages: document.querySelector("#messages"),
  statusLine: document.querySelector("#statusLine"),
  chatForm: document.querySelector("#chatForm"),
  messageInput: document.querySelector("#messageInput"),
  charCount: document.querySelector("#charCount"),
  sendBtn: document.querySelector("#sendBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  copyBtn: document.querySelector("#copyBtn"),
  toast: document.querySelector("#toast"),
};

let supabase = null;
let selectedJob = null;
let messages = [];
let sending = false;

function getJobIcon(jobName) {
  return JOBS.find((job) => job.name === jobName)?.icon || "💼";
}

function makeGreeting(jobName) {
  return `안녕하세요. 저는 AI가 역할을 맡은 가상의 ${jobName}입니다. 실제 개인의 경험담이 아니라 직업에 대한 일반적인 정보를 바탕으로 답변해 드릴게요. 무엇이 가장 궁금한가요?`;
}

function renderJobs() {
  els.jobGrid.innerHTML = "";
  JOBS.forEach((job) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "job-card";
    button.innerHTML = `
      <span class="job-icon" aria-hidden="true">${job.icon}</span>
      <span class="job-name">${escapeHtml(job.name)}</span>
      <span class="job-desc">${escapeHtml(job.desc)}</span>
    `;
    button.addEventListener("click", () => startInterview(job.name));
    els.jobGrid.appendChild(button);
  });
}

function renderQuestions() {
  els.questionChips.innerHTML = "";
  SUGGESTED_QUESTIONS.forEach((question) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "question-chip";
    button.textContent = question;
    button.addEventListener("click", () => {
      els.messageInput.value = question;
      updateCharCount();
      els.messageInput.focus();
    });
    els.questionChips.appendChild(button);
  });
}

function startInterview(jobName, restoredMessages = null) {
  selectedJob = jobName.trim();
  if (!selectedJob) return;

  messages = restoredMessages?.length
    ? restoredMessages
    : [{ role: "assistant", content: makeGreeting(selectedJob) }];

  els.jobAvatar.textContent = getJobIcon(selectedJob);
  els.jobTitle.textContent = selectedJob;
  els.jobSubtitle.textContent = "가상 면담 · 자유롭게 후속 질문 가능";
  els.setupView.classList.add("hidden");
  els.chatView.classList.remove("hidden");
  renderMessages();
  saveSession();
  setTimeout(() => els.messageInput.focus(), 50);
}

function renderMessages() {
  els.messages.innerHTML = "";
  messages.forEach((message) => {
    const row = document.createElement("div");
    row.className = `message-row ${message.role}`;

    const wrapper = document.createElement("div");
    const label = document.createElement("div");
    label.className = "message-label";
    label.textContent = message.role === "user" ? "나" : selectedJob;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = message.content;

    wrapper.append(label, bubble);
    row.appendChild(wrapper);
    els.messages.appendChild(row);
  });
  els.messages.scrollTop = els.messages.scrollHeight;
}

async function ensureAnonymousSession() {
  if (!supabase) {
    if (SUPABASE_URL.includes("YOUR_PROJECT_REF") || SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE")) {
      throw new Error("config.js에 Supabase URL과 Publishable key를 입력해 주세요.");
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) return sessionData.session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`익명 접속 실패: ${error.message}`);
  return data.session;
}

async function sendMessage(text) {
  if (sending || !selectedJob) return;
  sending = true;
  setBusy(true, "직업인이 답변을 준비하고 있습니다…");

  messages.push({ role: "user", content: text });
  renderMessages();
  saveSession();

  try {
    await ensureAnonymousSession();

    const context = messages.slice(-14).map(({ role, content }) => ({ role, content }));
    const { data, error } = await supabase.functions.invoke("career-interview", {
      body: { job: selectedJob, messages: context },
    });

    if (error) {
      const details = await extractFunctionError(error);
      throw new Error(details || error.message || "AI 호출에 실패했습니다.");
    }
    if (!data?.reply) throw new Error("AI 응답 내용이 비어 있습니다.");

    messages.push({ role: "assistant", content: data.reply });
    renderMessages();
    saveSession();
  } catch (error) {
    messages.push({
      role: "assistant",
      content: `지금은 답변을 가져오지 못했습니다. 잠시 후 같은 질문을 다시 보내 주세요.\n\n[오류 안내] ${error.message}`,
    });
    renderMessages();
    saveSession();
  } finally {
    sending = false;
    setBusy(false, "");
  }
}

async function extractFunctionError(error) {
  try {
    if (error?.context && typeof error.context.json === "function") {
      const body = await error.context.json();
      return body?.error || body?.message || "";
    }
  } catch (_) {}
  return "";
}

function setBusy(isBusy, text) {
  els.sendBtn.disabled = isBusy;
  els.messageInput.disabled = isBusy;
  els.statusLine.textContent = text;
}

function saveSession() {
  localStorage.setItem(
    "careerInterviewSession",
    JSON.stringify({ job: selectedJob, messages, savedAt: Date.now() })
  );
  updateRestoreButton();
}

function loadSession() {
  try {
    const raw = localStorage.getItem("careerInterviewSession");
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.job || !Array.isArray(session.messages)) return null;
    return session;
  } catch (_) {
    return null;
  }
}

function updateRestoreButton() {
  els.restoreBtn.classList.toggle("hidden", !loadSession());
}

function resetInterview() {
  if (!confirm("현재 면담 기록을 지우고 새 면담을 시작할까요?")) return;
  localStorage.removeItem("careerInterviewSession");
  selectedJob = null;
  messages = [];
  els.chatView.classList.add("hidden");
  els.setupView.classList.remove("hidden");
  els.messageInput.value = "";
  updateCharCount();
  updateRestoreButton();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function copyTranscript() {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "학생" : selectedJob}: ${m.content}`)
    .join("\n\n");
  const text = `[AI 직업인 면담 기록]\n직업: ${selectedJob}\n\n${transcript}\n\n※ AI가 생성한 가상 면담 내용입니다.`;

  try {
    await navigator.clipboard.writeText(text);
    showToast("면담 기록을 복사했습니다.");
  } catch (_) {
    showToast("복사 권한이 없어 기록을 선택해 복사해 주세요.");
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add("hidden"), 1800);
}

function updateCharCount() {
  els.charCount.textContent = `${els.messageInput.value.length} / 500`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.customJobBtn.addEventListener("click", () => startInterview(els.customJob.value));
els.customJob.addEventListener("keydown", (event) => {
  if (event.key === "Enter") startInterview(els.customJob.value);
});
els.restoreBtn.addEventListener("click", () => {
  const session = loadSession();
  if (session) startInterview(session.job, session.messages);
});
els.resetBtn.addEventListener("click", resetInterview);
els.copyBtn.addEventListener("click", copyTranscript);
els.messageInput.addEventListener("input", updateCharCount);
els.messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    els.chatForm.requestSubmit();
  }
});
els.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = els.messageInput.value.trim();
  if (!text || sending) return;
  els.messageInput.value = "";
  updateCharCount();
  sendMessage(text);
});

renderJobs();
renderQuestions();
updateRestoreButton();
updateCharCount();
