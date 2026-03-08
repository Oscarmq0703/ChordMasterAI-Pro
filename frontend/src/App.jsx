import React, { useMemo, useState } from "react";
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
  Monitor,
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

const chordTypes = [
  "大三",
  "小三",
  "减三",
  "增三",
  "属七",
  "减七",
  "半减七",
  "大七",
  "小七",
  "那不勒斯六",
  "增六和弦",
  "挂留和弦",
  "主四六和弦",
  "主 I",
  "下属 IV",
  "属 V（V7）",
];

const studentData = [
  { name: "王同学", progress: 100, accuracy: 90, weak: "减七、增六和弦" },
  { name: "李同学", progress: 80, accuracy: 75, weak: "半减七、挂留和弦" },
  { name: "张同学", progress: 60, accuracy: 68, weak: "属七、主四六" },
  { name: "陈同学", progress: 100, accuracy: 96, weak: "那不勒斯六" },
  { name: "赵同学", progress: 40, accuracy: 55, weak: "增三、减三" },
];

const chartData = Array.from({ length: 10 }, (_, index) => ({
  name: `Q${index + 1}`,
  rate: [92, 78, 84, 70, 88, 66, 80, 74, 91, 76][index],
}));

const whiteKeys = ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G", "A", "B"];
const blackKeys = [
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

function progressToScore(progress, total = 10) {
  const completed = Math.round((progress / 100) * total);
  return `${completed}/${total}`;
}

function StatusPill({
  online = true,
  textOnline = "系统在线",
  textOffline = "系统离线",
}) {
  return (
    <div style={{ ...styles.statusPill, ...(online ? styles.statusOnline : styles.statusOffline) }}>
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span>{online ? textOnline : textOffline}</span>
    </div>
  );
}

function Surface({ children, style = {} }) {
  return <div style={{ ...styles.surface, ...style }}>{children}</div>;
}

function TitleBlock({ eyebrow, icon, iconColor, title, desc, titleColor }) {
  return (
    <div>
      <div style={styles.eyebrow}>{eyebrow}</div>
      <div style={{ ...styles.moduleTitle, color: titleColor || "#fff" }}>
        <span style={{ display: "inline-flex", color: iconColor || "#fff" }}>{icon}</span>
        <span>{title}</span>
      </div>
      {desc ? <div style={styles.moduleDesc}>{desc}</div> : null}
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={styles.segmentWrap}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              ...styles.segmentBtn,
              ...(active ? styles.segmentBtnActive : null),
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressFill, width: `${value}%` }} />
    </div>
  );
}

function PianoKeyboard({ adaptive = false, showLabels = false }) {
  const whiteWidth = 44;
  const whiteHeight = 170;
  const blackWidth = 28;
  const blackHeight = 104;
  const keyboardWidth = whiteKeys.length * whiteWidth;

  const wrapStyle = adaptive
    ? { ...styles.keyboardWrap, padding: 12 }
    : { ...styles.keyboardWrap, overflowX: "auto", padding: 16 };

  const layoutStyle = adaptive
    ? { position: "relative", width: "100%", aspectRatio: `${keyboardWidth} / ${whiteHeight}` }
    : { position: "relative", width: keyboardWidth, height: whiteHeight };

  return (
    <div style={wrapStyle}>
      <div style={layoutStyle}>
        <div style={{ display: "flex", height: "100%" }}>
          {whiteKeys.map((key, i) => (
            <button
              key={`${key}-${i}`}
              type="button"
              style={{
                ...styles.whiteKey,
                width: adaptive ? `${100 / whiteKeys.length}%` : whiteWidth,
                height: "100%",
              }}
            >
              {showLabels ? key : null}
            </button>
          ))}
        </div>

        {blackKeys.map((key, i) => {
          const left = adaptive
            ? `calc(${((key.afterWhiteIndex + 1) / whiteKeys.length) * 100}% - ${(blackWidth / keyboardWidth) * 50}%)`
            : (key.afterWhiteIndex + 1) * whiteWidth - blackWidth / 2;

          return (
            <button
              key={`${key.note}-${i}`}
              type="button"
              style={{
                ...styles.blackKey,
                left,
                width: adaptive ? `${(blackWidth / keyboardWidth) * 100}%` : blackWidth,
                height: adaptive ? `${(blackHeight / whiteHeight) * 100}%` : blackHeight,
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

function TeacherView() {
  const [selected, setSelected] = useState(chordTypes);
  const [mode, setMode] = useState("name");

  const toggleChord = (item) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item],
    );
  };

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
              <TitleBlock
                eyebrow="Student Access"
                icon={<QrCode size={18} />}
                iconColor="#7dd3fc"
                title="学生扫码进入"
                titleColor="#e0f2fe"
                desc="课堂统一扫码登录，快速进入学生端并接收同一组练习任务。"
              />

              <div style={styles.qrShell}>
                <div style={styles.qrGlow} />
                <div style={styles.qrPanel}>
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,.68)" }}>
                    <QrCode size={64} style={{ marginBottom: 14 }} />
                    <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,.9)" }}>
                      课堂二维码
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,.42)" }}>
                      学生扫码后进入学生端
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Surface>

          <Surface style={{ gridColumn: "span 8", overflow: "hidden" }}>
            <div style={styles.cardPad}>
              <TitleBlock
                eyebrow="Practice Control"
                icon={<Music2 size={18} />}
                iconColor="#c4b5fd"
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
                  <div style={styles.countBadge}>已选择 {selected.length} 类</div>
                </div>

                <div style={styles.chordGrid}>
                  {chordTypes.map((item) => {
                    const checked = selected.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleChord(item)}
                        style={{
                          ...styles.chordItem,
                          ...(checked ? styles.chordItemChecked : null),
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          style={{ width: 16, height: 16 }}
                        />
                        <span>{item}</span>
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
            <TitleBlock
              eyebrow="Practice Launch"
              icon={<Play size={18} />}
              iconColor="#c4b5fd"
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
                <button type="button" style={styles.primaryBtn}>
                  开始出题
                </button>
              </div>
            </div>
          </div>
        </Surface>

        <Surface style={{ overflow: "hidden" }}>
          <div style={styles.cardPad}>
            <TitleBlock
              eyebrow="Classroom Live Data"
              icon={<Users size={18} />}
              iconColor="#6ee7b7"
              title="在线学生列表"
              titleColor="#d1fae5"
              desc="实时查看学生参与状态、完成进度、正确率与当前薄弱和弦类型。"
            />

            <div style={styles.innerPanel}>
              <div style={styles.studentHeader}>
                <div style={{ color: "#bae6fd" }}>学生姓名</div>
                <div style={{ color: "#ddd6fe", textAlign: "center" }}>完成进度</div>
                <div style={{ color: "#a7f3d0", paddingLeft: 24 }}>正确率</div>
                <div style={{ color: "#fde68a" }}>薄弱和弦类型</div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {studentData.map((student) => (
                  <div key={student.name} style={styles.studentRow}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,.92)" }}>
                        {student.name}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,.34)" }}>
                        Student Profile
                      </div>
                    </div>

                    <div style={styles.progressCol}>
                      <ProgressBar value={student.progress} />
                      <span style={styles.progressScore}>{progressToScore(student.progress)}</span>
                    </div>

                    <div style={{ paddingLeft: 24 }}>
                      <span style={styles.rateBadge}>{student.accuracy}%</span>
                    </div>

                    <div style={{ color: "rgba(255,255,255,.64)" }}>{student.weak}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Surface>

        <Surface style={{ overflow: "hidden" }}>
          <div style={styles.cardPad}>
            <TitleBlock
              eyebrow="Performance Overview"
              icon={<BarChart3 size={18} />}
              iconColor="#fcd34d"
              title="每道题全班正确率"
              titleColor="#fef3c7"
              desc="从整组题目中快速识别易错题与高区分度题目，为下一轮课堂训练提供依据。"
            />

            <div style={{ ...styles.innerPanel, height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
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

function StudentView() {
  const [name, setName] = useState("张同学");
  const [mode] = useState("name");
  const [currentQuestion] = useState(4);
  const [showAiSummary] = useState(false);

  const feedback = useMemo(
    () => ({
      status: true,
      title: "听想反馈",
      text: "第 4 题回答正确。你已能在内听中保持属功能张力，并准确提取和弦核心音型。",
      advice:
        "本组 10 题后，建议按‘整体聆听 → 核心音型辨识 → 功能归类 → 新主音迁移’继续练习，先巩固大三、小三、属七的稳定听想，再推进减七与半减七的功能分辨。",
      tags: ["内听保持", "音型辨识", "功能感知", "迁移应用"],
    }),
    [],
  );

  const instantCorrect = true;

  return (
    <div style={styles.page}>
      <div style={styles.bgGlowTopSmall} />
      <div style={styles.bgGlowRightSmall} />

      <div style={styles.studentShell}>
        <div style={styles.studentTopCard}>
          <div style={styles.studentTopGrid}>
            <div style={styles.studentInfoCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 500 }}>
                <Smartphone size={18} />
                <span>学生端</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,.40)" }}>建议横屏操作</div>
            </div>

            <div style={styles.studentInfoCard}>
              <div style={styles.topMiniLabel}>Student Name</div>
              <div style={styles.nameRow}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
                  style={styles.nameInput}
                />
                <button type="button" style={styles.confirmBtn}>
                  确定
                </button>
              </div>
            </div>

            <div style={styles.studentInfoCard}>
              <div style={styles.topMiniLabel}>Connection</div>
              <div style={{ marginTop: 12 }}>
                <StatusPill textOnline="已连接" textOffline="未连接" />
              </div>
            </div>
          </div>
        </div>

        <div style={styles.studentMidGrid}>
          <Surface style={{ gridColumn: "span 4" }}>
            <div style={{ padding: 16 }}>
              <div style={styles.sectionLabel}>题目</div>
              {mode === "name" ? (
                <div style={styles.questionCard}>
                  请弹奏：<span style={{ color: "#fff" }}>C 属七和弦</span>
                </div>
              ) : (
                <button type="button" style={{ ...styles.primaryBtn, height: 48, fontSize: 15 }}>
                  <Play size={18} style={{ marginRight: 8 }} />
                  播放
                </button>
              )}
            </div>
          </Surface>

          <Surface style={{ gridColumn: "span 3" }}>
            <div style={{ padding: 16 }}>
              <div style={styles.sectionLabel}>答题进度</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: 8 }}>
                <div>
                  <div style={styles.scoreBig}>4 / 10</div>
                  <div style={styles.scoreSub}>已完成题目数量</div>
                </div>
                <div>
                  <div style={styles.scoreBig}>3</div>
                  <div style={styles.scoreSub}>正确题目数量</div>
                </div>
              </div>
            </div>
          </Surface>

          <Surface style={{ gridColumn: "span 5" }}>
            <div style={{ padding: 16 }}>
              <div style={styles.feedbackHead}>
                <BrainCircuit size={16} color="#f0abfc" />
                <span>{showAiSummary ? "AI智能反馈 · Gordon 听想" : `第 ${currentQuestion} 题反馈`}</span>
              </div>

              {!showAiSummary ? (
                <div
                  style={{
                    ...styles.instantFeedback,
                    ...(instantCorrect ? styles.instantCorrect : styles.instantWrong),
                  }}
                >
                  {instantCorrect ? "回答正确" : "回答错误"}
                </div>
              ) : (
                <>
                  <div style={styles.aiFeedbackCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, marginBottom: 6 }}>
                      {feedback.status ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {feedback.status ? "回答正确" : "回答错误"}
                    </div>
                    <div>{feedback.text}</div>
                  </div>

                  <div style={styles.aiAdviceCard}>
                    <div style={styles.tagRow}>
                      {feedback.tags.map((tag) => (
                        <span key={tag} style={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span style={{ color: "rgba(255,255,255,.88)", fontWeight: 600 }}>听想练习建议：</span>
                    {feedback.advice}
                  </div>
                </>
              )}
            </div>
          </Surface>
        </div>

        <Surface style={{ minHeight: 0, flex: 1, overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "16px 16px 8px 16px", flexShrink: 0 }}>
              <div style={{ ...styles.moduleTitle, fontSize: 16, color: "#cffafe" }}>
                <Piano size={18} color="#67e8f9" />
                <span>双八度钢琴键盘</span>
              </div>
            </div>
            <div style={{ minHeight: 0, flex: 1, padding: "0 16px 16px 16px" }}>
              <PianoKeyboard adaptive showLabels={false} />
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("teacher");

  return (
    <div style={styles.appRoot}>
      <div style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div>
            <div style={styles.topBarTitle}>ChordMasterAI Pro</div>
            <div style={styles.topBarSub}>Unified UI Prototype · ChordMasterAI Pro</div>
          </div>

          <div style={styles.switchWrap}>
            <button
              type="button"
              onClick={() => setView("teacher")}
              style={{
                ...styles.switchBtn,
                ...(view === "teacher" ? styles.switchBtnActive : null),
              }}
            >
              <Monitor size={16} />
              <span>教师端</span>
            </button>
            <button
              type="button"
              onClick={() => setView("student")}
              style={{
                ...styles.switchBtn,
                ...(view === "student" ? styles.switchBtnActive : null),
              }}
            >
              <Smartphone size={16} />
              <span>学生端</span>
            </button>
          </div>
        </div>
      </div>

      {view === "teacher" ? <TeacherView /> : <StudentView />}
    </div>
  );
}

const styles = {
  appRoot: {
    minHeight: "100vh",
    background: "#0b0c10",
    color: "#fff",
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
    maxWidth: 1280,
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
  switchWrap: {
    display: "flex",
    gap: 8,
    borderRadius: 999,
    padding: 4,
    background: "rgba(255,255,255,.04)",
  },
  switchBtn: {
    border: 0,
    borderRadius: 999,
    padding: "10px 16px",
    background: "transparent",
    color: "rgba(255,255,255,.72)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  switchBtnActive: {
    background: "rgba(255,255,255,.12)",
    color: "#fff",
  },
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    background: "#0b0c10",
    padding: 32,
  },
  container: {
    position: "relative",
    maxWidth: 1280,
    margin: "0 auto",
    display: "grid",
    gap: 32,
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
    fontSize: 68,
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
    gap: 24,
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
    width: 288,
    height: 288,
    borderRadius: 30,
    border: "1px solid rgba(255,255,255,.14)",
    background: "radial-gradient(circle at top, rgba(255,255,255,.16), rgba(255,255,255,.03))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
  },
  studentShell: {
    position: "relative",
    maxWidth: 980,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    height: "calc(100svh - 76px)",
    overflow: "hidden",
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
    gridColumn: "span 3",
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
};