import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type StatusPillProps = {
  online?: boolean;
  textOnline?: string;
  textOffline?: string;
};

type SurfaceProps = {
  children: React.ReactNode;
  className?: string;
};

type PianoKeyboardProps = {
  compact?: boolean;
  showLabels?: boolean;
  adaptive?: boolean;
};

type StudentRow = {
  name: string;
  progress: number;
  accuracy: number;
  weak: string;
};

type Feedback = {
  status: boolean;
  title: string;
  text: string;
  advice: string;
  tags: string[];
};

type BlackKey = {
  note: string;
  afterWhiteIndex: number;
};

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

const studentData: StudentRow[] = [
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

function validateKeyboardLayout() {
  console.assert(whiteKeys.length === 14, "Expected 14 white keys for two octaves.");
  console.assert(blackKeys.length === 10, "Expected 10 black keys for two octaves.");
  console.assert(
    blackKeys.every((key) => key.afterWhiteIndex >= 0 && key.afterWhiteIndex < whiteKeys.length - 1),
    "Each black key should be placed between two white keys.",
  );
}

validateKeyboardLayout();

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function StatusPill({
  online = true,
  textOnline = "系统在线",
  textOffline = "系统离线",
}: StatusPillProps) {
  return (
    <div
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
        online ? "border-white/12 bg-white/[0.05] text-white/84" : "border-white/10 bg-white/[0.04] text-white/55",
      )}
    >
      {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <span>{online ? textOnline : textOffline}</span>
    </div>
  );
}

function Surface({ children, className = "" }: SurfaceProps) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-[32px] border border-white/12",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.085),rgba(255,255,255,0.04))]",
        "shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function PianoKeyboard({ compact = false, showLabels = true, adaptive = false }: PianoKeyboardProps) {
  const whiteWidth = compact ? 38 : 44;
  const whiteHeight = compact ? 150 : 182;
  const blackWidth = compact ? 24 : 28;
  const blackHeight = compact ? 92 : 112;
  const keyboardWidth = whiteKeys.length * whiteWidth;

  const containerClass = adaptive
    ? "relative mx-auto w-full rounded-[28px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
    : "relative mx-auto w-full overflow-x-auto rounded-[28px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

  const layoutStyle = adaptive
    ? ({ aspectRatio: `${keyboardWidth} / ${whiteHeight}`, width: "100%" } as const)
    : ({ width: keyboardWidth } as const);

  const whiteKeyStyle = adaptive
    ? ({ width: `${100 / whiteKeys.length}%`, height: "100%" } as const)
    : ({ width: whiteWidth, height: whiteHeight } as const);

  return (
    <div className={containerClass}>
      <div className="relative" style={layoutStyle}>
        <div className="flex h-full">
          {whiteKeys.map((key, index) => (
            <button
              key={`${key}-${index}`}
              type="button"
              className="flex items-end justify-center border border-black/8 bg-[linear-gradient(180deg,#ffffff,#f4f4f5)] pb-2 text-[10px] font-medium text-zinc-700 shadow-[0_10px_18px_rgba(0,0,0,0.08)] transition hover:brightness-[0.99] active:brightness-95"
              style={whiteKeyStyle}
            >
              {showLabels ? key : null}
            </button>
          ))}
        </div>

        {blackKeys.map((key, index) => {
          const left = adaptive
            ? `calc(${((key.afterWhiteIndex + 1) / whiteKeys.length) * 100}% - ${(blackWidth / keyboardWidth) * 50}%)`
            : (key.afterWhiteIndex + 1) * whiteWidth - blackWidth / 2;

          const blackStyle = adaptive
            ? ({
                left,
                width: `${(blackWidth / keyboardWidth) * 100}%`,
                height: `${(blackHeight / whiteHeight) * 100}%`,
              } as const)
            : ({ left, width: blackWidth, height: blackHeight } as const);

          return (
            <button
              key={`${key.note}-${index}`}
              type="button"
              className="absolute top-0 z-10 flex items-end justify-center rounded-b-[10px] border border-black/35 bg-[linear-gradient(180deg,#1d1d1f,#050505)] pb-1.5 text-[9px] text-zinc-300 shadow-[0_10px_24px_rgba(0,0,0,0.34)] transition hover:brightness-110 active:brightness-95"
              style={blackStyle}
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
  const [selected, setSelected] = useState<string[]>(chordTypes);
  const [mode, setMode] = useState("name");

  const toggleChord = (item: string) => {
    setSelected((prev) => (prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item]));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0c10] px-5 py-8 text-white lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-[-8rem] top-24 h-[24rem] w-[24rem] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-[-8rem] bottom-[-4rem] h-[24rem] w-[24rem] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.045),transparent_20%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1680px] space-y-8">
        <section className="relative overflow-hidden rounded-[40px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.045))] px-10 py-10 shadow-[0_36px_100px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-[-30%] h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-white/12 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_50%)]" />
          </div>
          <div className="relative flex items-start justify-between gap-8">
            <div className="max-w-4xl">
              <div className="text-sm font-medium uppercase tracking-[0.22em] text-sky-200/60">ChordMasterAI Pro</div>
              <h1 className="mt-4 text-[4.25rem] font-semibold leading-[0.95] tracking-[-0.07em] text-white">
                ChordMasterAI Pro
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-white/58">
                以课堂联机、听想训练与即时反馈为核心，连接教师出题、学生弹奏、班级统计与个性化建议，打造更具音乐感知深度的和弦学习体验。
              </p>
            </div>
            <div className="pt-2">
              <StatusPill online textOnline="系统在线" textOffline="系统离线" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-6">
          <Surface className="col-span-4 overflow-hidden p-0">
            <Card className="border-0 bg-transparent text-white shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4 px-1">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/38">Student Access</div>
                    <CardTitle className="mt-2 flex items-center gap-2 text-[1.18rem] font-medium text-sky-100">
                      <QrCode className="h-5 w-5 text-sky-300" /> 学生扫码进入
                    </CardTitle>
                    <div className="mt-2 text-sm leading-6 text-white/48">
                      课堂统一扫码登录，快速进入学生端并接收同一组练习任务。
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-2">
                <div className="relative overflow-hidden rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/2 top-[-18%] h-44 w-44 -translate-x-1/2 rounded-full bg-white/12 blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_48%)]" />
                  </div>
                  <div className="relative mx-auto flex h-72 w-72 items-center justify-center rounded-[30px] border border-white/14 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=https%3A%2F%2Fchordmasterai-frontend.onrender.com%2Fstudent"
                      alt="学生端二维码"
                      className="h-[240px] w-[240px] rounded-[18px] bg-white p-3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Surface>

          <Surface className="col-span-8 overflow-hidden p-0">
            <Card className="border-0 bg-transparent text-white shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-6 px-1">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/38">Practice Control</div>
                    <CardTitle className="mt-2 flex items-center gap-2 text-[1.18rem] font-medium text-violet-100">
                      <Music2 className="h-5 w-5 text-violet-300" /> 和弦类型与出题设置
                    </CardTitle>
                    <div className="mt-2 text-sm leading-6 text-white/48">
                      选择训练和弦，构建本轮练习题库，为统一出题做好准备。
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/34">Chord Library</div>
                      <div className="mt-2 text-base font-medium text-white/88">选择要纳入本轮练习的和弦类型</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-white/70">
                      已选择 {selected.length} 类
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3.5">
                    {chordTypes.map((item) => {
                      const checked = selected.includes(item);
                      return (
                        <div
                          key={item}
                          className={cx(
                            "flex items-center gap-3 rounded-[22px] border px-3.5 py-3.5 transition",
                            checked
                              ? "border-white/14 bg-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                              : "border-white/8 bg-white/[0.035]",
                          )}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleChord(item)} />
                          <span className="text-sm text-white/82">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Surface>
        </div>

        <Surface className="overflow-hidden p-0">
          <Card className="border-0 bg-transparent text-white shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-6 px-1">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/38">Practice Launch</div>
                  <CardTitle className="mt-2 flex items-center gap-2 text-[1.18rem] font-medium text-violet-100">
                    <Play className="h-5 w-5 text-violet-300" /> 选择学生作答方式与开始出题
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="mb-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/34">Response Mode</div>
                    <div className="mt-2 text-base font-medium text-white/88">选择学生作答方式</div>
                  </div>
                  <Tabs value={mode} onValueChange={setMode}>
                    <TabsList className="grid w-full grid-cols-2 rounded-[20px] bg-white/[0.05] p-1">
                      <TabsTrigger value="name" className="rounded-[16px]">
                        模式一：给音名答题
                      </TabsTrigger>
                      <TabsTrigger value="audio" className="rounded-[16px]">
                        模式二：听和弦答题
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-white/60">
                    {mode === "name"
                      ? "系统随机显示和弦名称，学生在虚拟钢琴上逐个弹出和弦构成音。"
                      : "系统播放和弦音响，学生依据内听与功能感知判断构成音并逐个弹奏。"}
                  </div>
                </div>
                <div className="col-span-6 flex flex-col justify-center rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.045))] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/34">Launch Practice</div>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <div className="text-3xl font-semibold tracking-[-0.05em]">10 题</div>
                    <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/64">
                      当前模式：{mode === "name" ? "给音名答题" : "听和弦答题"}
                    </div>
                  </div>
                  <Button className="mt-5 h-12 w-full rounded-full bg-white px-8 text-[20px] font-semibold text-black hover:bg-white/90 shadow-[0_14px_30px_rgba(255,255,255,0.16)]">
                    开始出题
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Surface>

        <Surface className="overflow-hidden p-0">
          <Card className="border-0 bg-transparent text-white shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-6 px-1">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/38">Classroom Live Data</div>
                  <CardTitle className="mt-2 flex items-center gap-2 text-[1.18rem] font-medium text-emerald-100">
                    <Users className="h-5 w-5 text-emerald-300" /> 在线学生列表
                  </CardTitle>
                  <div className="mt-2 text-sm leading-6 text-white/48">
                    实时查看学生参与状态、完成进度、正确率与当前薄弱和弦类型。
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="grid grid-cols-[1.1fr_1.55fr_0.8fr_1.35fr] gap-6 px-4 pb-4 text-[1rem] font-semibold tracking-[0.02em] text-white/92">
                  <div className="text-sky-200">学生姓名</div>
                  <div className="text-center text-violet-200">完成进度</div>
                  <div className="pl-6 text-emerald-200">正确率</div>
                  <div className="text-amber-200">薄弱和弦类型</div>
                </div>
                <div className="space-y-3">
                  {studentData.map((student) => (
                    <div
                      key={student.name}
                      className="grid grid-cols-[1.1fr_1.55fr_0.8fr_1.35fr] items-center gap-6 rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    >
                      <div>
                        <div className="font-medium text-white/90">{student.name}</div>
                        <div className="mt-1 text-xs text-white/34">Student Profile</div>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <Progress value={student.progress} className="h-3 w-[68%] bg-white/10 [&>div]:bg-violet-300" />
                        <span className="w-14 text-right text-white/78">{progressToScore(student.progress)}</span>
                      </div>
                      <div className="pl-6">
                        <Badge className="rounded-full border border-white/10 bg-white/[0.07] text-white/84 hover:bg-white/[0.09]">
                          {student.accuracy}%
                        </Badge>
                      </div>
                      <div className="text-white/62">{student.weak}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </Surface>

        <Surface className="overflow-hidden p-0">
          <Card className="border-0 bg-transparent text-white shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-6 px-1">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/38">Performance Overview</div>
                  <CardTitle className="mt-2 flex items-center gap-2 text-[1.18rem] font-medium text-amber-100">
                    <BarChart3 className="h-5 w-5 text-amber-300" /> 每道题全班正确率
                  </CardTitle>
                  <div className="mt-2 text-sm leading-6 text-white/48">
                    从整组题目中快速识别易错题与高区分度题目，为下一轮课堂训练提供依据。
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 h-80 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
            </CardContent>
          </Card>
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

  const feedback: Feedback = useMemo(
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
  const feedbackClass = feedback.status
    ? "border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] text-white/86"
    : "border-white/12 bg-white/[0.05] text-white/62";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0c10] p-5 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-[-4rem] bottom-[-4rem] h-[20rem] w-[20rem] rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-[100svh] max-w-[980px] flex-col gap-3 overflow-hidden rounded-[36px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl lg:h-[calc(100svh-76px)]">
        <div className="shrink-0 rounded-[28px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3 rounded-[28px] border border-white/14 bg-white/[0.07] px-4 py-4">
              <div className="flex items-center gap-2 text-[1.04rem] font-medium text-white/86">
                <Smartphone className="h-5 w-5 text-white/82" />
                <span>学生端</span>
              </div>
              <div className="mt-2 text-xs text-white/40">建议横屏操作</div>
            </div>
            <div className="col-span-6 rounded-[28px] border border-white/14 bg-white/[0.07] px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/38">Student Name</div>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 flex-1 rounded-[22px] border-white/10 bg-white/[0.04] px-4 text-base text-white placeholder:text-white/28"
                  placeholder="请输入姓名"
                />
                <Button className="h-11 rounded-full bg-white px-5 text-sm font-medium text-black hover:bg-white/90">
                  确定
                </Button>
              </div>
            </div>
            <div className="col-span-3 rounded-[28px] border border-white/14 bg-white/[0.07] px-4 py-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/38">Connection</div>
              <div className="mt-3">
                <StatusPill online textOnline="已连接" textOffline="未连接" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-12 gap-3">
          <Surface className="col-span-4">
            <div className="space-y-2 p-4">
              <div className="text-sm text-white/42">题目</div>
              {mode === "name" ? (
                <div className="rounded-[26px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.05))] p-5 text-[1.4rem] font-semibold leading-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  请弹奏：<span className="text-white">C 属七和弦</span>
                </div>
              ) : (
                <Button className="h-12 w-full rounded-full bg-white text-[15px] font-medium text-black shadow-[0_12px_28px_rgba(255,255,255,0.12)] hover:bg-white/90">
                  <Play className="mr-2 h-5 w-5" /> 播放
                </Button>
              )}
            </div>
          </Surface>

          <Surface className="col-span-3">
            <div className="p-4">
              <div className="text-sm text-white/42">答题进度</div>
              <div className="mt-2 flex items-end gap-5">
                <div>
                  <div className="text-[1.8rem] font-semibold tracking-[-0.04em]">4 / 10</div>
                  <div className="mt-1 text-xs text-white/36">已完成题目数量</div>
                </div>
                <div>
                  <div className="text-[1.8rem] font-semibold tracking-[-0.04em]">3</div>
                  <div className="mt-1 text-xs text-white/36">正确题目数量</div>
                </div>
              </div>
            </div>
          </Surface>

          <Surface className="col-span-5">
            <div className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-sm text-fuchsia-100/80">
                <BrainCircuit className="h-4 w-4 text-fuchsia-300" />
                {showAiSummary ? "AI智能反馈 · Gordon 听想" : `第 ${currentQuestion} 题反馈`}
              </div>

              {!showAiSummary ? (
                <div
                  className={cx(
                    "rounded-[24px] border p-4 text-base font-medium",
                    instantCorrect
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                      : "border-red-300/20 bg-red-400/10 text-red-100",
                  )}
                >
                  {instantCorrect ? "回答正确" : "回答错误"}
                </div>
              ) : (
                <>
                  <div className={cx("rounded-[26px] border p-4 text-sm leading-6", feedbackClass)}>
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      {feedback.status ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {feedback.status ? "回答正确" : "回答错误"}
                    </div>
                    <div>{feedback.text}</div>
                  </div>
                  <div className="rounded-[26px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.045))] p-4 text-sm leading-6 text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="mb-2 flex flex-wrap gap-2">
                      {feedback.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/72">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="font-medium text-white/86">听想练习建议：</span>
                    {feedback.advice}
                  </div>
                </>
              )}
            </div>
          </Surface>
        </div>

        <Surface className="min-h-0 flex-1 overflow-hidden">
          <Card className="flex h-full flex-col border-0 bg-transparent text-white shadow-none">
            <CardHeader className="shrink-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-[1.02rem] font-medium text-cyan-100">
                <Piano className="h-5 w-5 text-cyan-300" /> 双八度钢琴键盘
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-4 pt-0">
              <PianoKeyboard compact showLabels={false} adaptive />
            </CardContent>
          </Card>
        </Surface>
      </div>
    </div>
  );
}

export default function AIChordGamePrototype() {
  const [view, setView] = useState("teacher");

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0c10]/72 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between px-4 py-3">
          <div>
            <div className="text-[1.4rem] font-semibold tracking-[-0.03em] text-white">ChordMasterAI Pro</div>
            <div className="text-xs text-sky-200/50">Unified UI Prototype · ChordMasterAI Pro</div>
          </div>
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="rounded-full bg-white/[0.04] p-1">
              <TabsTrigger value="teacher" className="rounded-full px-4">
                <Monitor className="mr-2 h-4 w-4" />教师端
              </TabsTrigger>
              <TabsTrigger value="student" className="rounded-full px-4">
                <Smartphone className="mr-2 h-4 w-4" />学生端
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      {view === "teacher" ? <TeacherView /> : <StudentView />}
    </div>
  );
}
