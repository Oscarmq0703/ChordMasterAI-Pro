import React, { CSSProperties, useEffect, useMemo, useState } from "react";
import { playPianoSample } from "./audio";
import {
  BarChart3,
  Wifi,
  WifiOff,
  QrCode,
  Music2,
  Play,
  Users,
  BrainCircuit,
  Piano,
  CheckCircle2,
  XCircle,
  Smartphone,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://chordmasterai-backend.onrender.com";

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 15000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function getSessionIdFromUrl() {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  return url.searchParams.get("session") || "";
}

function getStoredStudent(sessionId: string) {
  if (typeof window === "undefined" || !sessionId) return null;
  const raw = localStorage.getItem(`cm_student_${sessionId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredStudent(sessionId: string, payload: { studentId: string; name: string }) {
  if (typeof window === "undefined" || !sessionId) return;
  localStorage.setItem(`cm_student_${sessionId}`, JSON.stringify(payload));
}

type StudentRow = {
  name: string;
  progress: number;
  accuracy: number;
  weak: string;
};

type Feedback = {
  totalAnswered: number;
  correctCount: number;
  accuracy: number;
  level: "excellent" | "good" | "developing" | "needsFocus";
  weakTypes: string[];
  summary: string;
  focus: string;
  suggestion: string;
  nextStep: string;
  updatedAt: number;
};

type BlackKey = {
  note: string;
  afterWhiteIndex: number;
};

type TeacherSession = {
  sessionId: string;
  status: string;
  createdAt?: string;
  startedAt?: string | null;
  currentQuestionIndex?: number;
  questions?: Array<{
    id: string;
    index: number;
    prompt: string;
    displayName: string;
    type: string;
    typeLabel: string;
    root: string;
  }>;
 students?: Array<{
  studentId: string;
  name: string;
  joinedAt?: string;
  lastActiveAt?: string;
  answeredCount: number;
  progress: number;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  weak: string;
  currentQuestionIndex: number;
  feedback?: Feedback | null;
}>;
  chartData?: Array<{
    name: string;
    rate: number;
    total: number;
    correct: number;
    displayName: string;
  }>;
  stats?: Record<string, any>;
  classFeedback?: {
    finishedCount: number;
    averageAccuracy: number;
    commonWeakTypes: string[];
    summary: string;
    updatedAt: number;
  } | null;
};

type StudentSession = {
  sessionId: string;
  status: string;
  studentId: string;
  name: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  completedCount: number;
  correctCount: number;
  wrongCount: number;
  isFinished: boolean;
  currentQuestion: {
    id: string;
    index: number;
    prompt: string;
    displayName: string;
    type: string;
    typeLabel: string;
    root: string;
  } | null;
  lastAnswer?: {
    questionId: string;
    questionIndex: number;
    prompt: string;
    displayName: string;
    type: string;
    typeLabel: string;
    answer: string;
    isCorrect: boolean;
    submittedAt: string;
  } | null;
  feedback?: Feedback | null;
};

const chordTypeOptions = [
  { label: "大三和弦", value: "major" },
  { label: "小三和弦", value: "minor" },
  { label: "减三和弦", value: "dim" },
  { label: "增三和弦", value: "aug" },
  { label: "属七和弦", value: "dom7" },
  { label: "大七和弦", value: "maj7" },
  { label: "小七和弦", value: "min7" },
];

const chartData = Array.from({ length: 10 }, (_, index) => ({
  name: `Q${index + 1}`,
  rate: [92, 78, 84, 70, 88, 66, 80, 74, 91, 76][index],
}));

const whiteKeys = ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G", "A", "B"];

const blackKeys: BlackKey[] = [
  { note: "C#", afterWhiteIndex: 0 },
  { note: "D#", afterWhiteIndex: 1 },
  { note: "F#", afterWhiteIndex: 3 },
  { note: "G#", afterWhiteIndex: 4 },
  { note: "A#", afterWhiteIndex: 5 },
  { note: "C#", afterWhiteIndex: 7 },
  { note: "D#", afterWhiteIndex: 8 },
  { note: "F#", afterWhiteIndex: 10 },
  { note: "G#", afterWhiteIndex: 11 },
  { note: "A#", afterWhiteIndex: 12 },
];

function progressToScore(progress: number, total = 10) {
  const completed = Math.round((progress / 100) * total);
  return `${completed}/${total}`;
}

function getChordTypeLabel(type: string) {
  const map: Record<string, string> = {
    major: "大三和弦",
    minor: "小三和弦",
    dim: "减三和弦",
    aug: "增三和弦",
    maj7: "大七和弦",
    min7: "小七和弦",
    dom7: "属七和弦",
  };

  return map[type] || type;
}

function StatusPill({
  online = true,
  textOnline = "系统在线",
  textOffline = "系统离线",
}: {
  online?: boolean;
  textOnline?: string;
  textOffline?: string;
}) {
  return (
    <div style={{ ...styles.statusPill, ...(online ? styles.statusOnline : styles.statusOffline) }}>
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span>{online ? textOnline : textOffline}</span>
    </div>
  );
}

function Surface({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return <div style={{ ...styles.surface, ...style }}>{children}</div>;
}

function SectionTitle({
  eyebrow,
  icon,
  title,
  titleColor,
  desc,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  titleColor: string;
  desc?: string;
}) {
  return (
    <div>
      <div style={styles.eyebrow}>{eyebrow}</div>
      <div style={{ ...styles.moduleTitle, color: titleColor }}>
        {icon}
        <span>{title}</span>
      </div>
      {desc ? <div style={styles.moduleDesc}>{desc}</div> : null}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div style={styles.segmentWrap}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              ...styles.segmentBtn,
              ...(active ? styles.segmentBtnActive : {}),
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressFill, width: `${value}%` }} />
    </div>
  );
}

function PianoKeyboard({
  adaptive = false,
  showLabels = false,
  onNoteClick,
  selectedKeyIds = [],
}: {
  adaptive?: boolean;
  showLabels?: boolean;
  onNoteClick?: (keyId: string, note: string) => void;
  selectedKeyIds?: string[];
}) {
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  const whiteWidth = 44;
  const whiteHeight = 170;
  const blackWidth = 28;
  const blackHeight = 104;
  const keyboardWidth = whiteKeys.length * whiteWidth;

  const triggerKeyFeedback = (keyId: string, note: string) => {
  setActiveKeys((prev) => [...prev, keyId]);
  onNoteClick?.(keyId, note);

    setTimeout(() => {
      setActiveKeys((prev) => prev.filter((item) => item !== keyId));
    }, 180);
  };

  const isKeyActive = (keyId: string) => activeKeys.includes(keyId);

  const wrapStyle = adaptive
    ? { ...styles.keyboardWrap, padding: 12 }
    : { ...styles.keyboardWrap, overflowX: "auto" as const, padding: 16 };

  const layoutStyle = adaptive
    ? ({ position: "relative", width: "100%", aspectRatio: `${keyboardWidth} / ${whiteHeight}` } as CSSProperties)
    : ({ position: "relative", width: keyboardWidth, height: whiteHeight } as CSSProperties);

  return (
    <div style={wrapStyle}>
      <div style={layoutStyle}>
        <div style={{ display: "flex", height: "100%" }}>
          {whiteKeys.map((key, index) => {
            const keyId = `white-${key}-${index}`;
const active = isKeyActive(keyId);
const selected = selectedKeyIds.includes(keyId);

            return (
              <button
                key={keyId}
                type="button"
                onClick={() => triggerKeyFeedback(keyId, key)}
                style={{
  ...styles.whiteKey,
  ...(selected ? (styles.whiteKeySelected || {}) : {}),
  ...(active ? styles.whiteKeyActive : {}),
  width: adaptive ? `${100 / whiteKeys.length}%` : whiteWidth,
  height: "100%",
}}
              >
                {showLabels ? key : null}
              </button>
            );
          })}
        </div>

        {blackKeys.map((key, index) => {
          const keyId = `black-${key.note}-${index}`;
const active = isKeyActive(keyId);
const selected = selectedKeyIds.includes(keyId);

          const left = adaptive
            ? `calc(${((key.afterWhiteIndex + 1) / whiteKeys.length) * 100}% - ${(blackWidth / keyboardWidth) * 50}%)`
            : (key.afterWhiteIndex + 1) * whiteWidth - blackWidth / 2;

          const blackStyle: CSSProperties = adaptive
            ? {
                left,
                width: `${(blackWidth / keyboardWidth) * 100}%`,
                height: `${(blackHeight / whiteHeight) * 100}%`,
              }
            : {
                left: left as number,
                width: blackWidth,
                height: blackHeight,
              };

          return (
            <button
              key={keyId}
              type="button"
              onClick={() => triggerKeyFeedback(keyId, key.note)}
              style={{
  ...styles.blackKey,
  ...(selected ? (styles.blackKeySelected || {}) : {}),
  ...(active ? styles.blackKeyActive : {}),
  ...blackStyle,
}}
            >
              {showLabels ? key.note : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
  
function TeacherView({
  selectedChordTypes,
  setSelectedChordTypes,
  sessionId,
  studentJoinUrl,
  teacherSession,
  sessionLoading,
  sessionError,
  startTeacherQuiz,
}: {
  selectedChordTypes: string[];
  setSelectedChordTypes: React.Dispatch<React.SetStateAction<string[]>>;
  sessionId: string;
  studentJoinUrl: string;
  teacherSession: TeacherSession | null;
  sessionLoading: boolean;
  sessionError: string;
  startTeacherQuiz: () => Promise<void>;
}) {
  const [mode, setMode] = useState("name");
  const classFeedback = teacherSession?.classFeedback ?? null;

  const toggleChord = (item: string) => {
    setSelectedChordTypes((prev) =>
      prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item],
    );
  };

  const qrValue = encodeURIComponent(
    studentJoinUrl || "https://chordmasterai-frontend.onrender.com/student"
  );

  return (
    <div style={styles.page}>
      <div style={styles.bgGlowTop} />
      <div style={styles.bgGlowLeft} />
      <div style={styles.bgGlowRight} />

      <div style={styles.container}>
        <section style={styles.hero}>
          <div style={styles.heroGlow} />
          <div style={styles.heroContent}>
            <div style={{ maxWidth: 860 }}>
              <div style={styles.heroEyebrow}>ChordMasterAI Pro</div>
              <h1 style={styles.heroTitle}>ChordMasterAI Pro</h1>
              <p style={styles.heroDesc}>
                以课堂联机、听想训练与即时反馈为核心，连接教师出题、学生弹奏、班级统计与个性化建议，
                打造更具音乐感知深度的和弦学习体验。
              </p>
            </div>
            <div style={{ paddingTop: 8 }}>
              <StatusPill />
            </div>
          </div>
        </section>

        <div style={styles.grid12}>
          <Surface style={{ gridColumn: "span 4", overflow: "hidden" }}>
            <div style={styles.cardPad}>
              <SectionTitle
                eyebrow="Student Access"
                icon={<QrCode size={18} color="#7dd3fc" />}
                title="学生扫码进入"
                titleColor="#e0f2fe"
                desc="课堂统一扫码登录，快速进入学生端并接收同一组练习任务。"
              />

              <div style={styles.qrShell}>
                <div style={styles.qrGlow} />
                <div style={styles.qrPanel}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${qrValue}`}
                    alt="学生端二维码"
                    style={styles.qrImage}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 16,
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.08)",
                  color: "#e5e7eb",
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>当前课堂号</div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>
                  {sessionId || "未创建"}
                </div>

                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 12, marginBottom: 6 }}>
                  学生进入链接
                </div>
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    wordBreak: "break-all",
                    color: "#67e8f9",
                  }}
                >
                  {studentJoinUrl || "开始出题后生成"}
                </div>
              </div>
            </div>
          </Surface>

          <Surface style={{ gridColumn: "span 8", overflow: "hidden" }}>
            <div style={styles.cardPad}>
              <SectionTitle
                eyebrow="Practice Control"
                icon={<Music2 size={18} color="#c4b5fd" />}
                title="和弦类型与出题设置"
                titleColor="#ede9fe"
                desc="选择训练和弦，构建本轮练习题库，为统一出题做好准备。"
              />

              <div style={styles.innerPanel}>
                <div style={styles.innerPanelHead}>
                  <div>
                    <div style={styles.smallEyebrow}>Chord Library</div>
                    <div style={styles.innerPanelTitle}>选择要纳入本轮练习的和弦类型</div>
                  </div>
                  <div style={styles.countBadge}>已选择 {selectedChordTypes.length} 类</div>
                </div>

                <div style={styles.chordGrid}>
                  {chordTypeOptions.map((item) => {
                    const checked = selectedChordTypes.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => toggleChord(item.value)}
                        style={{
                          ...styles.chordItem,
                          ...(checked ? styles.chordItemChecked : {}),
                        }}
                      >
                        <input type="checkbox" checked={checked} readOnly style={{ width: 16, height: 16 }} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Surface>
        </div>

        <Surface style={{ overflow: "hidden" }}>
          <div style={styles.cardPad}>
            <SectionTitle
              eyebrow="Practice Launch"
              icon={<Play size={18} color="#c4b5fd" />}
              title="选择学生作答方式与开始出题"
              titleColor="#ede9fe"
            />

            <div style={styles.grid12}>
              <div style={{ ...styles.innerPanel, gridColumn: "span 6" }}>
                <div style={styles.smallEyebrow}>Response Mode</div>
                <div style={styles.innerPanelTitle}>选择学生作答方式</div>

                <Segmented
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "name", label: "模式一：给音名答题" },
                    { value: "audio", label: "模式二：听和弦答题" },
                  ]}
                />

                <div style={{ ...styles.softPanel, marginTop: 18 }}>
                  {mode === "name"
                    ? "系统随机显示和弦名称，学生在虚拟钢琴上逐个弹出和弦构成音。"
                    : "系统播放和弦音响，学生依据内听与功能感知判断构成音并逐个弹奏。"}
                </div>
              </div>

              <div style={{ ...styles.launchCard, gridColumn: "span 6" }}>
                <div style={styles.smallEyebrow}>Launch Practice</div>
                <div style={styles.launchRow}>
                  <div style={styles.launchCount}>10 题</div>
                  <div style={styles.modeBadge}>
                    当前模式：{mode === "name" ? "给音名答题" : "听和弦答题"}
                  </div>
                </div>

                <button type="button" style={styles.primaryBtn} onClick={startTeacherQuiz}>
                  开始出题
                </button>

                {sessionLoading ? (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#93c5fd" }}>
                    正在生成题目并同步课堂…
                  </div>
                ) : null}

                {sessionError ? (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#fca5a5" }}>
                    {sessionError}
                  </div>
                ) : null}

                {teacherSession?.questions?.length ? (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#86efac" }}>
                    已生成 {teacherSession.questions.length} 题，当前第{" "}
                    {(teacherSession.currentQuestionIndex || 0) + 1} 题
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Surface>

        {classFeedback ? (
          <Surface style={{ overflow: "hidden" }}>
            <div style={styles.cardPad}>
              <SectionTitle
                eyebrow="Class AI Feedback"
                icon={<BrainCircuit size={18} color="#f0abfc" />}
                title="班级 AI 听想反馈"
                titleColor="#f5d0fe"
                desc="根据已完成 10 题学生的整体表现，汇总班级平均正确率与共性薄弱和弦类型。"
              />

              <div style={styles.innerPanel}>
                <div style={styles.feedbackMetricRow}>
                  <div style={styles.feedbackMetricCard}>
                    <div style={styles.feedbackMetricValue}>{classFeedback.finishedCount}</div>
                    <div style={styles.feedbackMetricLabel}>已完成学生</div>
                  </div>
                  <div style={styles.feedbackMetricCard}>
                    <div style={styles.feedbackMetricValue}>{classFeedback.averageAccuracy}%</div>
                    <div style={styles.feedbackMetricLabel}>班级平均正确率</div>
                  </div>
                  <div style={styles.feedbackMetricCard}>
                    <div style={styles.feedbackMetricValue}>
                      {classFeedback.commonWeakTypes?.length || 0}
                    </div>
                    <div style={styles.feedbackMetricLabel}>共性薄弱点</div>
                  </div>
                </div>

                <div style={styles.aiAdviceCard}>
                  <div style={styles.feedbackBlockTitle}>班级总结</div>
                  <div style={{ marginBottom: 10 }}>{classFeedback.summary}</div>

                  {classFeedback.commonWeakTypes?.length ? (
                    <>
                      <div style={styles.feedbackBlockTitle}>重点关注和弦</div>
                      <div style={styles.tagRow}>
                        {classFeedback.commonWeakTypes.map((type) => (
                          <span key={type} style={styles.tag}>
                            {getChordTypeLabel(type)}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </Surface>
        ) : null}

        <Surface style={{ overflow: "hidden" }}>
          <div style={styles.cardPad}>
            <SectionTitle
              eyebrow="Classroom Live Data"
              icon={<Users size={18} color="#6ee7b7" />}
              title="在线学生列表"
              titleColor="#d1fae5"
              desc="基于当前课堂真实提交数据，显示学生进度、正确率与反馈摘要。"
            />

            <div style={styles.innerPanel}>
              <div style={styles.studentHeader}>
                <div style={{ color: "#bae6fd" }}>学生姓名</div>
                <div style={{ color: "#ddd6fe", textAlign: "center" }}>完成进度</div>
                <div style={{ color: "#a7f3d0", paddingLeft: 24 }}>正确率</div>
                <div style={{ color: "#fde68a" }}>薄弱和弦类型</div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
{!teacherSession?.students?.length ? (
  <div style={{ color: "rgba(255,255,255,.52)", padding: "8px 4px" }}>
    暂无学生加入课堂
  </div>
) : null}           
    {(teacherSession?.students?.length ? teacherSession.students : []).map((student: any) => (
  <div key={student.studentId || student.name} style={styles.studentRow}>
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,.92)" }}>
        {student.name}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,.34)" }}>
        已完成 {student.answeredCount} 题
      </div>

  
    </div>

    <div style={styles.progressCol}>
      <ProgressBar value={student.progress || 0} />
      <span style={styles.progressScore}>{progressToScore(student.progress || 0)}</span>
    </div>

    <div style={{ paddingLeft: 24 }}>
      <span style={styles.rateBadge}>{student.accuracy || 0}%</span>
    </div>

    <div style={{ color: "rgba(255,255,255,.64)" }}>{student.weak || "—"}</div>
  </div>
))}
              </div>
            </div>
          </div>
        </Surface>

        <Surface style={{ overflow: "hidden" }}>
          <div style={styles.cardPad}>
            <SectionTitle
              eyebrow="Performance Overview"
              icon={<BarChart3 size={18} color="#fcd34d" />}
              title="每道题全班正确率"
              titleColor="#fef3c7"
              desc="当前仍为占位图表，下一步接学生提交答案后改为真实统计数据。"
            />

            <div style={{ ...styles.innerPanel, height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teacherSession?.chartData?.length ? teacherSession.chartData : chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f333b" />
                  <XAxis dataKey="name" stroke="#8b9098" />
                  <YAxis stroke="#8b9098" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.96)",
                      border: "1px solid rgba(15,23,42,0.12)",
                      borderRadius: "14px",
                      color: "#111827",
                      boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
                    }}
                    labelStyle={{ color: "#374151", fontWeight: 600 }}
                    itemStyle={{ color: "#111827", fontWeight: 700 }}
                    cursor={{ fill: "rgba(255,255,255,0.08)" }}
                  />
                  <Bar dataKey="rate" radius={[10, 10, 0, 0]} fill="#f5f5f7" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}

function StudentView({
  sessionId,
  studentId,
  studentName,
  setStudentName,
  studentSession,
  sessionError,
  joinStudentSession,
  answerSubmitting,
  answerFeedback,
  handlePianoNoteClick,
  selectedNotes,
  selectedKeyIds,
}: {
  sessionId: string;
  studentId: string;
  studentName: string;
  setStudentName: React.Dispatch<React.SetStateAction<string>>;
  studentSession: StudentSession | null;
  sessionError: string;
  joinStudentSession: () => Promise<void>;
  answerSubmitting: boolean;
  answerFeedback: {
    type: "" | "success" | "error";
    message: string;
  };
  handlePianoNoteClick: (keyId: string, note: string) => void;
  selectedNotes: string[];
  selectedKeyIds: string[];
}) {
  const feedback = studentSession?.feedback ?? null;
const showAiSummary =
  !!feedback &&
  typeof feedback.totalAnswered === "number" &&
  feedback.totalAnswered >= 10;

  return (
    <div style={styles.page}>
      <div style={styles.bgGlowTopSmall} />
      <div style={styles.bgGlowRightSmall} />

      <div style={styles.studentShell}>
        <div style={styles.studentTopCard}>
          <div style={styles.studentTopGrid}>
            <div style={{ ...styles.studentInfoCard, gridColumn: "span 3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 500 }}>
                <Smartphone size={18} />
                <span>学生端</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,.40)" }}>建议横屏操作</div>
            </div>

            <div style={{ ...styles.studentInfoCard, gridColumn: "span 6" }}>
              <div style={styles.topMiniLabel}>Student Name</div>
              <div style={styles.nameRow}>
                <input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="请输入姓名"
                  style={styles.nameInput}
                />
                <button type="button" style={styles.confirmBtn} onClick={joinStudentSession}>
                  {studentId ? "已加入" : "确定"}
                </button>
              </div>
            </div>

            <div style={{ ...styles.studentInfoCard, gridColumn: "span 3" }}>
              <div style={styles.topMiniLabel}>Connection</div>
              <div style={{ marginTop: 12 }}>
                <StatusPill
                  online={!!sessionId}
                  textOnline="已连接"
                  textOffline="未连接"
                />
              </div>
            </div>
          </div>
        </div>

        <div style={styles.studentMidGrid}>
          <Surface style={{ gridColumn: "span 4" }}>
            <div style={{ padding: 16 }}>
              <div style={styles.sectionLabel}>题目</div>

              <div
                style={{
                  marginTop: 8,
                  borderRadius: 26,
                  border: "1px solid rgba(255,255,255,.14)",
                  background: "linear-gradient(180deg, rgba(255,255,255,.11), rgba(255,255,255,.05))",
                  padding: 20,
                  fontSize: "1.1rem",
                  lineHeight: 1.8,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
                }}
              >
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginBottom: 8 }}>
                  当前课堂
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#f9fafb", marginBottom: 14 }}>
                  {sessionId || "未加入课堂"}
                </div>

                {!sessionId ? (
                  <div style={{ fontSize: 14, color: "#fca5a5" }}>
                    请通过教师二维码或带 session 参数的链接进入学生端
                  </div>
                ) : !studentSession ? (
                  <div style={{ fontSize: 14, color: "#93c5fd" }}>
                    正在同步课堂题目…
                  </div>
                ) : studentSession.status !== "running" ? (
                  <div style={{ fontSize: 14, color: "#fcd34d" }}>
                    教师尚未开始出题，请稍候…
                  </div>
                ) : studentSession.isFinished ? (
                  <div style={{ fontSize: 16, color: "#86efac", fontWeight: 700 }}>
                    本轮题目已完成
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginBottom: 8 }}>
                      第 {studentSession.currentQuestionIndex + 1} / {studentSession.totalQuestions} 题
                    </div>

                    <div style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
                      {studentSession.currentQuestion?.displayName || "—"}
                    </div>

                    <div style={{ fontSize: 16, color: "#cbd5e1" }}>
                      {studentSession.currentQuestion?.prompt || "暂无题目"}
                    </div>
                  </>
                )}

                {sessionError ? (
                  <div style={{ marginTop: 12, fontSize: 13, color: "#fca5a5" }}>
                    {sessionError}
                  </div>
                ) : null}
              </div>
            </div>
          </Surface>

          <Surface style={{ gridColumn: "span 4" }}>
  <div style={{ padding: 16 }}>
    <div style={styles.sectionLabel}>弹奏作答</div>

    <div
      style={{
        marginTop: 10,
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(255,255,255,.05)",
        padding: 16,
        color: "rgba(255,255,255,.78)",
        lineHeight: 1.8,
        minHeight: 120,
      }}
    >
      {!studentId ? (
        <div>请先输入姓名并加入课堂</div>
      ) : studentSession?.isFinished ? (
        <div>本轮练习已完成</div>
      ) : answerSubmitting ? (
        <div>正在判定本题，请稍候…</div>
      ) : (
        <div>
          直接在下方钢琴键盘上弹奏和弦。<br />
          三和弦按满 3 个不同音会自动判定，七和弦按满 4 个不同音会自动判定。
        </div>
      )}
    </div>
  </div>
</Surface>

          <Surface style={{ gridColumn: "span 4" }}>
  <div style={{ padding: 16 }}>
    <div style={styles.sectionLabel}>答题进度</div>

    <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: 8 }}>
      <div>
        <div style={styles.scoreBig}>
          {studentSession?.totalQuestions
            ? `${studentSession.completedCount} / ${studentSession.totalQuestions}`
            : "0 / 10"}
        </div>
        <div style={styles.scoreSub}>已提交题数</div>
      </div>
      <div>
        <div style={styles.scoreBig}>{studentSession?.correctCount ?? 0}</div>
        <div style={styles.scoreSub}>正确题目数量</div>
      </div>
    </div>

    {answerFeedback.message ? (
      <div
        style={{
          marginTop: 14,
          ...styles.instantFeedback,
          ...(answerFeedback.type === "error" ? styles.instantWrong : styles.instantCorrect),
        }}
      >
        {answerFeedback.type === "success" ? "本题正确" : "本题错误"}
      </div>
    ) : null}
  </div>
</Surface>

        </div>

        <Surface style={{ minHeight: 320, flex: 1, overflow: "visible" }}>
  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    <div style={{ padding: "16px 16px 8px 16px", flexShrink: 0 }}>
      <div style={{ ...styles.moduleTitle, fontSize: 16, color: "#cffafe" }}>
        <Piano size={18} color="#67e8f9" />
        <span>双八度钢琴键盘</span>
      </div>
    </div>
    <div style={{ minHeight: 260, flex: 1, padding: "0 16px 16px 16px" }}>
      <PianoKeyboard
        adaptive
        showLabels={false}
        onNoteClick={handlePianoNoteClick}
        selectedKeyIds={selectedKeyIds}
      />
    </div>
  </div>
</Surface>

{showAiSummary ? (
  <Surface>
    <div style={{ padding: 16 }}>
      <div style={styles.feedbackHead}>
        <BrainCircuit size={16} color="#f0abfc" />
        <span>AI智能反馈</span>
      </div>

      <div style={styles.feedbackSummaryWrap}>
        <div style={styles.feedbackMetricRow}>
          <div style={styles.feedbackMetricCard}>
            <div style={styles.feedbackMetricValue}>{feedback.accuracy}%</div>
            <div style={styles.feedbackMetricLabel}>正确率</div>
          </div>
          <div style={styles.feedbackMetricCard}>
            <div style={styles.feedbackMetricValue}>{feedback.correctCount}</div>
            <div style={styles.feedbackMetricLabel}>答对题数</div>
          </div>
          <div style={styles.feedbackMetricCard}>
            <div style={styles.feedbackMetricValue}>{feedback.totalAnswered}</div>
            <div style={styles.feedbackMetricLabel}>完成题数</div>
          </div>
        </div>

        <div style={styles.aiFeedbackCard}>
          <div style={styles.feedbackBlockTitle}>本轮学习反馈</div>
          <div>{feedback.summary}</div>
        </div>

        <div style={styles.aiAdviceCard}>
          <div style={styles.feedbackBlockTitle}>薄弱点分析</div>
          <div style={{ marginBottom: 10 }}>{feedback.focus}</div>

          {feedback.weakTypes?.length ? (
            <div style={styles.tagRow}>
              {feedback.weakTypes.map((type) => (
                <span key={type} style={styles.tag}>
                  {getChordTypeLabel(type)}
                </span>
              ))}
            </div>
          ) : null}

          <div style={styles.feedbackBlockTitle}>后续学习建议</div>
          <div style={{ marginBottom: 10 }}>{feedback.suggestion}</div>

          <div style={styles.feedbackBlockTitle}>下一步练习方向</div>
          <div>{feedback.nextStep}</div>
        </div>
      </div>
    </div>
  </Surface>
) : null}
      </div>
    </div>
  );
}

export default function App() {
  const initialView =
    typeof window !== "undefined" && window.location.pathname.startsWith("/student")
      ? "student"
      : "teacher";

  const [view, setView] = useState(initialView);
  const [sessionId, setSessionId] = useState(getSessionIdFromUrl());
  const [teacherSession, setTeacherSession] = useState<TeacherSession | null>(null);
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState("");
const [studentId, setStudentId] = useState("");
const [studentName, setStudentName] = useState("张同学");
const [answerSubmitting, setAnswerSubmitting] = useState(false);
const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]);
const [answerFeedback, setAnswerFeedback] = useState<{
  type: "" | "success" | "error";
  message: string;
}>({
  type: "",
  message: "",
});
  const [selectedChordTypes, setSelectedChordTypes] = useState<string[]>([
    "major",
    "minor",
    "dom7",
  ]);

  async function createSessionIfNeeded() {
    if (sessionId) return sessionId;

   const res = await fetchWithTimeout(
  `${API_BASE}/api/session/create`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  },
  15000
);

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "创建课堂失败");
    }

    setSessionId(data.sessionId);
    setTeacherSession(data.session);

    return data.sessionId;
  }

  async function fetchTeacherSession(currentSessionId: string) {
    const res = await fetch(`${API_BASE}/api/session/${currentSessionId}/teacher`);
    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "获取教师课堂失败");
    }

    setTeacherSession(data.session);
  }

 async function fetchStudentSession(currentSessionId: string, currentStudentId: string) {
  const res = await fetch(
    `${API_BASE}/api/session/${currentSessionId}/student/${currentStudentId}`
  );
  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.error || "获取学生课堂失败");
  }

  setStudentSession(data.studentSession);
}

async function submitStudentAnswer(notesArg?: string[]) {
  try {
    if (!sessionId || !studentId) {
      setSessionError("请先加入课堂");
      return;
    }

    const notesToSend = notesArg && notesArg.length ? notesArg : selectedNotes;

    if (!notesToSend.length) {
      setAnswerFeedback({
        type: "error",
        message: "请先弹奏钢琴键",
      });
      return;
    }

    setAnswerSubmitting(true);
    setAnswerFeedback({
      type: "",
      message: "",
    });

    const res = await fetch(`${API_BASE}/api/session/${sessionId}/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId,
        notes: notesToSend,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "提交答案失败");
    }

    setStudentSession(data.studentSession);
setTeacherSession(data.teacherSession);
setSelectedNotes([]);
setSelectedKeyIds([]);
setAnswerFeedback({
  type: data.isCorrect ? "success" : "error",
  message: data.isCorrect
    ? `回答正确，正确答案：${Array.isArray(data.correctAnswer) ? data.correctAnswer.join(" - ") : ""}`
    : `回答错误，正确答案：${Array.isArray(data.correctAnswer) ? data.correctAnswer.join(" - ") : ""}`,
});
  } catch (error: any) {
    setAnswerFeedback({
      type: "error",
      message: error.message || "提交答案失败",
    });
    setSelectedNotes([]);
setSelectedKeyIds([]);
  } finally {
    setAnswerSubmitting(false);
  }
}

async function joinStudentSession() {
  try {
    if (!sessionId) {
      setSessionError("缺少课堂号");
      return;
    }

    if (!studentName.trim()) {
      setSessionError("请输入姓名");
      return;
    }

    setSessionError("");

    const res = await fetch(`${API_BASE}/api/session/${sessionId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: studentName.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "加入课堂失败");
    }

    setStudentId(data.studentId);
    setStudentSession(data.studentSession);
    setStoredStudent(sessionId, {
      studentId: data.studentId,
      name: studentName.trim(),
    });
  } catch (error: any) {
    setSessionError(error.message || "加入课堂失败");
  }
}

function handlePianoNoteClick(keyId: string, note: string) {
  if (!studentId || !studentSession?.currentQuestion || studentSession?.isFinished || answerSubmitting) {
    return;
  }

  const octave = (() => {
    const parts = keyId.split("-");
    const index = Number(parts[2]);
    return index >= 7 ? 5 : 4;
  })();

  playPianoSample(note, octave).catch((err) => {
    console.error("playPianoSample failed:", err);
  });

  if (answerFeedback.message) {
    setAnswerFeedback({
      type: "",
      message: "",
    });
  }

  const expectedCount =
    studentSession.currentQuestion.type === "maj7" ||
    studentSession.currentQuestion.type === "min7" ||
    studentSession.currentQuestion.type === "dom7"
      ? 4
      : 3;

  setSelectedNotes((prevNotes) => {
    if (prevNotes.includes(note)) {
      return prevNotes;
    }

    const nextNotes = [...prevNotes, note];

    setSelectedKeyIds((prevKeyIds) => {
      if (prevKeyIds.includes(keyId)) {
        return prevKeyIds;
      }
      return [...prevKeyIds, keyId];
    });

    if (nextNotes.length >= expectedCount) {
      Promise.resolve().then(() => {
        submitStudentAnswer(nextNotes);
      });
    }

    return nextNotes;
  });
}

  async function startTeacherQuiz() {
    try {
      setSessionLoading(true);
      setSessionError("");

      const sid = await createSessionIfNeeded();

      const res = await fetchWithTimeout(
  `${API_BASE}/api/session/${sid}/start`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chordTypes: selectedChordTypes,
      count: 10,
    }),
  },
  20000
);

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "开始出题失败");
      }

      setTeacherSession(data.session);
    } catch (error: any) {
      setSessionError(error.message || "开始出题失败");
    } finally {
      setSessionLoading(false);
    }
  }
useEffect(() => {
  if (view !== "teacher" || !sessionId) return;

  fetchTeacherSession(sessionId).catch((err) => {
    console.error(err);
  });

  const timer = setInterval(() => {
    fetchTeacherSession(sessionId).catch((err) => {
      console.error(err);
    });
  }, 2000);

  return () => clearInterval(timer);
}, [view, sessionId]);

useEffect(() => {
  if (view !== "student" || !sessionId) return;

  const stored = getStoredStudent(sessionId);

  if (stored?.studentId) {
    setStudentId(stored.studentId);
    setStudentName(stored.name || "张同学");

    fetchStudentSession(sessionId, stored.studentId).catch((err) => {
      console.error(err);
      setSessionError("课堂存在，但学生状态获取失败");
    });

    const timer = setInterval(() => {
      fetchStudentSession(sessionId, stored.studentId).catch((err) => {
        console.error(err);
      });
    }, 2000);

    return () => clearInterval(timer);
  }
}, [view, sessionId]);

useEffect(() => {
  if (view !== "student") return;

  setSelectedNotes([]);
  setSelectedKeyIds([]);
}, [view, studentSession?.currentQuestion?.id]);

  const studentJoinUrl = useMemo(() => {
    if (!sessionId || typeof window === "undefined") return "";
    return `${window.location.origin}/student?session=${sessionId}`;
  }, [sessionId]);

    return (
    <div style={styles.appRoot}>
      <div style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div>
            <div style={styles.topBarTitle}>ChordMasterAI Pro</div>
            <div style={styles.topBarSub}>Unified UI Prototype · ChordMasterAI Pro</div>
          </div>
        </div>
      </div>

      {view === "teacher" ? (
        <TeacherView
          selectedChordTypes={selectedChordTypes}
          setSelectedChordTypes={setSelectedChordTypes}
          sessionId={sessionId}
          studentJoinUrl={studentJoinUrl}
          teacherSession={teacherSession}
          sessionLoading={sessionLoading}
          sessionError={sessionError}
          startTeacherQuiz={startTeacherQuiz}
        />
      ) : (
        <StudentView
  sessionId={sessionId}
  studentId={studentId}
  studentName={studentName}
  setStudentName={setStudentName}
  studentSession={studentSession}
  sessionError={sessionError}
  joinStudentSession={joinStudentSession}
  answerSubmitting={answerSubmitting}
  answerFeedback={answerFeedback}
  handlePianoNoteClick={handlePianoNoteClick}
  selectedNotes={selectedNotes}
  selectedKeyIds={selectedKeyIds}
/>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  appRoot: {
    minHeight: "100vh",
    background: "#0b0c10",
    color: "#fff",
    overflowX: "hidden",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  topBar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(11,12,16,0.72)",
    backdropFilter: "blur(20px)",
  },
  topBarInner: {
    maxWidth: 1680,
    width: "100%",
    margin: "0 auto",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: "-0.03em",
  },
  topBarSub: {
    fontSize: 12,
    color: "rgba(186,230,253,.5)",
  },
    page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    background: "#0b0c10",
    padding: "20px 16px",
  },
  container: {
    position: "relative",
    width: "100%",
    maxWidth: 1680,
    margin: "0 auto",
    display: "grid",
    gap: 24,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 40,
    border: "1px solid rgba(255,255,255,.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.045))",
    padding: 40,
    boxShadow: "0 36px 100px rgba(0,0,0,.30)",
    backdropFilter: "blur(20px)",
  },
  heroGlow: {
    position: "absolute",
    left: "50%",
    top: "-30%",
    width: 352,
    height: 352,
    transform: "translateX(-50%)",
    borderRadius: "50%",
    background: "rgba(255,255,255,.12)",
    filter: "blur(48px)",
  },
  heroContent: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    gap: 32,
  },
  heroEyebrow: {
    fontSize: 14,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: ".22em",
    color: "rgba(186,230,253,.6)",
  },
  heroTitle: {
    margin: "16px 0 0 0",
    fontSize: "clamp(36px, 6vw, 68px)",
    lineHeight: 0.95,
    fontWeight: 600,
    letterSpacing: "-0.07em",
  },
  heroDesc: {
    marginTop: 20,
    maxWidth: 760,
    fontSize: 18,
    lineHeight: 1.8,
    color: "rgba(255,255,255,.58)",
  },
  surface: {
    minWidth: 0,
    borderRadius: 32,
    border: "1px solid rgba(255,255,255,.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.04))",
    boxShadow: "0 28px 80px rgba(0,0,0,.28)",
    backdropFilter: "blur(20px)",
  },
  cardPad: {
    padding: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: ".2em",
    color: "rgba(255,255,255,.38)",
  },
  moduleTitle: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 19,
    fontWeight: 500,
  },
  moduleDesc: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 1.7,
    color: "rgba(255,255,255,.48)",
  },
  innerPanel: {
    marginTop: 12,
    borderRadius: 30,
    border: "1px solid rgba(255,255,255,.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025))",
    padding: 20,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.04)",
  },
  innerPanelHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  innerPanelTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 500,
    color: "rgba(255,255,255,.88)",
  },
  smallEyebrow: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: ".18em",
    color: "rgba(255,255,255,.34)",
  },
  countBadge: {
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.06)",
    padding: "8px 12px",
    fontSize: 14,
    color: "rgba(255,255,255,.70)",
  },
  chordGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
  },
  chordItem: {
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.035)",
    color: "rgba(255,255,255,.82)",
    padding: "14px 14px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    textAlign: "left",
  },
  chordItemChecked: {
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.09)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
  },
  grid12: {
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gap: 16,
    width: "100%",
  },
  qrShell: {
    marginTop: 12,
    position: "relative",
    overflow: "hidden",
    borderRadius: 34,
    border: "1px solid rgba(255,255,255,.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,.11), rgba(255,255,255,.04))",
    padding: 24,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
  },
  qrGlow: {
    position: "absolute",
    left: "50%",
    top: "-18%",
    width: 176,
    height: 176,
    transform: "translateX(-50%)",
    borderRadius: "50%",
    background: "rgba(255,255,255,.12)",
    filter: "blur(48px)",
  },
  qrPanel: {
    position: "relative",
    margin: "0 auto",
    width: "min(100%, 288px)",
    aspectRatio: "1 / 1",
    borderRadius: 30,
    border: "1px solid rgba(255,255,255,.14)",
    background: "radial-gradient(circle at top, rgba(255,255,255,.16), rgba(255,255,255,.03))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  qrImage: {
    width: 240,
    height: 240,
    borderRadius: 18,
    background: "#fff",
    padding: 12,
    objectFit: "cover",
  },
  segmentWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 4,
    borderRadius: 20,
    background: "rgba(255,255,255,.05)",
    padding: 4,
    marginTop: 18,
  },
  segmentBtn: {
    border: 0,
    borderRadius: 16,
    background: "transparent",
    color: "rgba(255,255,255,.72)",
    padding: "13px 16px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  segmentBtnActive: {
    background: "rgba(255,255,255,.12)",
    color: "#fff",
  },
  softPanel: {
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    padding: 20,
    fontSize: 14,
    lineHeight: 1.9,
    color: "rgba(255,255,255,.60)",
  },
  launchCard: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    borderRadius: 30,
    border: "1px solid rgba(255,255,255,.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.045))",
    padding: 20,
    textAlign: "center",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
  },
  launchRow: {
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  launchCount: {
    fontSize: 30,
    fontWeight: 600,
    letterSpacing: "-0.05em",
  },
  modeBadge: {
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.06)",
    padding: "8px 14px",
    fontSize: 14,
    color: "rgba(255,255,255,.64)",
  },
  primaryBtn: {
    marginTop: 20,
    height: 48,
    width: "100%",
    border: 0,
    borderRadius: 999,
    background: "#fff",
    color: "#000",
    fontSize: 20,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 14px 30px rgba(255,255,255,.16)",
  },
  studentHeader: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1.55fr 0.8fr 1.35fr",
    gap: 24,
    padding: "0 16px 16px 16px",
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: ".02em",
    color: "rgba(255,255,255,.92)",
  },
  studentRow: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1.55fr 0.8fr 1.35fr",
    gap: 24,
    alignItems: "center",
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.05)",
    padding: 16,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.04)",
  },
  progressCol: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  progressTrack: {
    width: "68%",
    height: 12,
    borderRadius: 999,
    background: "rgba(255,255,255,.10)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "#c4b5fd",
  },
  progressScore: {
    width: 56,
    textAlign: "right",
    color: "rgba(255,255,255,.78)",
  },
  rateBadge: {
    display: "inline-block",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.07)",
    padding: "7px 12px",
    color: "rgba(255,255,255,.84)",
    fontSize: 14,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    padding: "7px 12px",
    fontSize: 14,
  },
  statusOnline: {
    background: "rgba(255,255,255,.05)",
    color: "rgba(255,255,255,.84)",
  },
  statusOffline: {
    background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.55)",
  },
  keyboardWrap: {
    position: "relative",
    margin: "0 auto",
    width: "100%",
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,.14)",
    background: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
  },
 whiteKey: {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  border: "1px solid rgba(0,0,0,.08)",
  background: "linear-gradient(180deg, #ffffff, #f4f4f5)",
  paddingBottom: 8,
  fontSize: 10,
  fontWeight: 500,
  color: "#3f3f46",
  boxShadow: "0 10px 18px rgba(0,0,0,.08)",
  transition: "all 0.08s ease",
},
  blackKey: {
  position: "absolute",
  top: 0,
  zIndex: 10,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  borderRadius: "0 0 10px 10px",
  border: "1px solid rgba(0,0,0,.35)",
  background: "linear-gradient(180deg, #1d1d1f, #050505)",
  paddingBottom: 6,
  fontSize: 9,
  color: "#d4d4d8",
  boxShadow: "0 10px 24px rgba(0,0,0,.34)",
  transition: "all 0.08s ease",
},
whiteKeyActive: {
  transform: "translateY(2px) scale(0.99)",
  background: "linear-gradient(180deg, #fefce8, #fde68a)",
  boxShadow: "0 0 0 1px rgba(251,191,36,.35), 0 10px 24px rgba(251,191,36,.28)",
  transition: "all 0.08s ease",
},

blackKeyActive: {
  transform: "translateY(2px) scale(0.98)",
  background: "linear-gradient(180deg, #3f3f46, #18181b)",
  boxShadow: "0 0 0 1px rgba(103,232,249,.35), 0 10px 26px rgba(103,232,249,.22)",
  transition: "all 0.08s ease",
},
whiteKeySelected: {
  background: "linear-gradient(180deg, #eff6ff, #bfdbfe)",
  boxShadow: "inset 0 0 0 1px rgba(59,130,246,.32), 0 8px 18px rgba(59,130,246,.18)",
},
blackKeySelected: {
  background: "linear-gradient(180deg, #0ea5e9, #1d4ed8)",
  boxShadow: "0 0 0 1px rgba(125,211,252,.55), 0 8px 22px rgba(59,130,246,.38)",
  color: "#eff6ff",
},
  studentShell: {
    position: "relative",
    maxWidth: 980,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: "calc(100svh - 76px)",
    overflow: "visible",
    borderRadius: 36,
    border: "1px solid rgba(255,255,255,.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.04))",
    padding: 16,
    boxShadow: "0 30px 90px rgba(0,0,0,.28)",
    backdropFilter: "blur(20px)",
  },
  studentTopCard: {
    flexShrink: 0,
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,.14)",
    background: "linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.05))",
    padding: 12,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
  },
  studentTopGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gap: 12,
  },
  studentInfoCard: {
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.07)",
    padding: "16px 16px",
  },
  topMiniLabel: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: ".18em",
    color: "rgba(255,255,255,.38)",
  },
  nameRow: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  nameInput: {
    height: 44,
    flex: 1,
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    color: "#fff",
    padding: "0 16px",
    outline: "none",
    fontSize: 16,
  },
  confirmBtn: {
    height: 44,
    borderRadius: 999,
    border: 0,
    background: "#fff",
    color: "#000",
    padding: "0 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  studentMidGrid: {
    flexShrink: 0,
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,.42)",
  },
  questionCard: {
    marginTop: 8,
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,.14)",
    background: "linear-gradient(180deg, rgba(255,255,255,.11), rgba(255,255,255,.05))",
    padding: 20,
    fontSize: "1.4rem",
    fontWeight: 600,
    lineHeight: 1.8,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
  },
  scoreBig: {
    fontSize: "1.8rem",
    fontWeight: 600,
    letterSpacing: "-0.04em",
  },
  scoreSub: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,.36)",
  },
  feedbackHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "rgba(250,232,255,.8)",
    marginBottom: 8,
  },
  instantFeedback: {
    borderRadius: 24,
    border: "1px solid",
    padding: 16,
    fontSize: 16,
    fontWeight: 600,
  },
  instantCorrect: {
    borderColor: "rgba(110,231,183,.20)",
    background: "rgba(52,211,153,.10)",
    color: "#d1fae5",
  },
  instantWrong: {
    borderColor: "rgba(252,165,165,.20)",
    background: "rgba(248,113,113,.10)",
    color: "#fee2e2",
  },
  aiFeedbackCard: {
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,.14)",
    background: "linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.05))",
    padding: 16,
    fontSize: 14,
    lineHeight: 1.7,
    color: "rgba(255,255,255,.86)",
  },
  aiAdviceCard: {
    marginTop: 8,
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,.14)",
    background: "linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.045))",
    padding: 16,
    fontSize: 14,
    lineHeight: 1.7,
    color: "rgba(255,255,255,.62)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    padding: "4px 10px",
    fontSize: 12,
    color: "rgba(255,255,255,.72)",
  },
  bgGlowTop: {
    position: "absolute",
    left: "50%",
    top: "-18rem",
    width: "34rem",
    height: "34rem",
    transform: "translateX(-50%)",
    borderRadius: "50%",
    background: "rgba(255,255,255,.10)",
    filter: "blur(48px)",
  },
  bgGlowLeft: {
    position: "absolute",
    left: "-8rem",
    top: "6rem",
    width: "24rem",
    height: "24rem",
    borderRadius: "50%",
    background: "rgba(255,255,255,.05)",
    filter: "blur(48px)",
  },
  bgGlowRight: {
    position: "absolute",
    right: "-8rem",
    bottom: "-4rem",
    width: "24rem",
    height: "24rem",
    borderRadius: "50%",
    background: "rgba(255,255,255,.05)",
    filter: "blur(48px)",
  },
  bgGlowTopSmall: {
    position: "absolute",
    left: "50%",
    top: "-12rem",
    width: "28rem",
    height: "28rem",
    transform: "translateX(-50%)",
    borderRadius: "50%",
    background: "rgba(255,255,255,.10)",
    filter: "blur(48px)",
  },
  bgGlowRightSmall: {
    position: "absolute",
    right: "-4rem",
    bottom: "-4rem",
    width: "20rem",
    height: "20rem",
    borderRadius: "50%",
    background: "rgba(255,255,255,.05)",
    filter: "blur(48px)",
  },
  feedbackSummaryWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  feedbackMetricRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
  feedbackMetricCard: {
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.06)",
    padding: 16,
    textAlign: "center",
  },
  feedbackMetricValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#ffffff",
  },
  feedbackMetricLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(255,255,255,.58)",
  },
  feedbackBlockTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "rgba(255,255,255,.90)",
    marginBottom: 8,
  },
  teacherMiniFeedback: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 1.6,
    color: "rgba(255,255,255,.58)",
  },
};