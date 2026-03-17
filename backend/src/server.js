import "dotenv/config";
import express from "express";
import cors from "cors";
import { redis } from "./redis.js";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(
  cors({
    origin: true,
    credentials: false,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "ChordMasterAI Pro backend is running",
  });
});

app.get("/health", async (req, res) => {
  res.json({
    ok: true,
    service: "chordmasterai-backend",
    time: new Date().toISOString(),
  });
});

app.get("/redis-test", async (req, res) => {
  try {
    const key = "healthcheck:redis";
    const value = `ok-${Date.now()}`;
    await redis.set(key, value, { ex: 60 });
    const result = await redis.get(key);

    res.json({
      ok: true,
      redis: result,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

function makeSessionId(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function makeStudentId(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

const ROOTS = ["C", "D", "E", "F", "G", "A", "B"];
const ACCIDENTALS = ["", "#", "b"];

const CHORD_LIBRARY = {
  major: { label: "大三和弦", suffix: "" },
  minor: { label: "小三和弦", suffix: "m" },
  dim: { label: "减三和弦", suffix: "dim" },
  aug: { label: "增三和弦", suffix: "aug" },

  dom7: { label: "属七和弦", suffix: "7" },
  dim7: { label: "减七和弦", suffix: "dim7" },
  m7b5: { label: "半减七和弦", suffix: "m7b5" },
  maj7: { label: "大七和弦", suffix: "maj7" },
  min7: { label: "小七和弦", suffix: "m7" },

  sus2: { label: "挂二和弦", suffix: "sus2" },
  sus4: { label: "挂四和弦", suffix: "sus4" },

  n6: { label: "那不勒斯六和弦", suffix: "N6" },
  it6: { label: "增六和弦", suffix: "It+6" },
  cad64: { label: "主四六和弦", suffix: "Cad64" },

  I: { label: "主和弦 I", suffix: "I" },
  IV: { label: "下属和弦 IV", suffix: "IV" },
  V: { label: "属和弦 V", suffix: "V" },
  V7: { label: "属七和弦 V7", suffix: "V7" },
};
const NOTE_TO_SEMITONE = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  "E#": 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

const SEMITONE_TO_NOTE = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const CHORD_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],

  dom7: [0, 4, 7, 10],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],

  sus2: [0, 2, 7],
  sus4: [0, 5, 7],

  // 课堂简化版：按音集判题，不要求低音
  n6: [0, 4, 7],     // 作为 bII 大三和弦音集使用
  it6: [0, 4, 10],   // 课堂简化版增六和弦
  cad64: [0, 4, 7],  // 主四六与 I 共音集，当前系统不判转位

  I: [0, 4, 7],
  IV: [0, 4, 7],
  V: [0, 4, 7],
  V7: [0, 4, 7, 10],
};

function getAvailableInversions(type) {
  const intervals = CHORD_INTERVALS[type] || [];
  if (intervals.length === 4) {
    return ["root", "first", "second", "third"];
  }
  return ["root", "first", "second"];
}

function pickInversion(type, inversionMode = "mixed") {
  const available = getAvailableInversions(type);

  if (inversionMode === "mixed") {
    return sample(available);
  }

  if (available.includes(inversionMode)) {
    return inversionMode;
  }

  return "root";
}

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildRoot() {
  return `${sample(ROOTS)}${sample(ACCIDENTALS)}`;
}

function getKeyLabel(keySignature = "C_major") {
  const map = {
    C_major: "C大调",
    G_major: "G大调",
    D_major: "D大调",
    A_major: "A大调",
    E_major: "E大调",
    B_major: "B大调",
    F_major: "F大调",
    Bb_major: "Bb大调",
    Eb_major: "Eb大调",

    A_minor: "A小调",
    E_minor: "E小调",
    D_minor: "D小调",
  };

  return map[keySignature] || keySignature;
}

function getInversionLabel(inversion = "mixed") {
  const map = {
    mixed: "混合随机",
    root: "原位",
    first: "第一转位",
    second: "第二转位",
    third: "第三转位",
  };

  return map[inversion] || inversion;
}

function normalizeAnswer(value = "") {
  return String(value).trim().replace(/\s+/g, "").toLowerCase();
}

function normalizeNote(note = "") {
  const cleaned = String(note).trim();
  return NOTE_TO_SEMITONE[cleaned] ?? null;
}

function getFunctionalRootSemitone(root, type) {
  const tonic = normalizeNote(root);
  if (tonic === null) return null;

  if (type === "I" || type === "cad64") return tonic;
  if (type === "IV") return (tonic + 5) % 12;
  if (type === "V" || type === "V7") return (tonic + 7) % 12;
  if (type === "n6") return (tonic + 1) % 12; // bII，当前用升半音等音近似
  if (type === "it6") return (tonic + 8) % 12; // 课堂简化版锚点
  return tonic;
}

function buildChordToneSet(root, type) {
  const rootValue = getFunctionalRootSemitone(root, type);
  const intervals = CHORD_INTERVALS[type] || [];

  if (rootValue === null) return [];

  return intervals
    .map((interval) => (rootValue + interval) % 12)
    .map((value) => SEMITONE_TO_NOTE[value]);
}

function normalizeNoteArray(notes = []) {
  const values = notes
    .map((note) => normalizeNote(note))
    .filter((value) => value !== null);

  return [...new Set(values)].sort((a, b) => a - b);
}

function parseKeyOrder(keyId = "") {
  const parts = String(keyId).split("-");
  const index = Number(parts[2]);
  return Number.isFinite(index) ? index : 999;
}

function areSameNoteSet(left = [], right = []) {
  const a = normalizeNoteArray(left);
  const b = normalizeNoteArray(right);

  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function getExpectedBassNote(tones = [], inversion = "root") {
  if (!tones.length) return null;

  if (inversion === "root") return tones[0] || null;
  if (inversion === "first") return tones[1] || null;
  if (inversion === "second") return tones[2] || null;
  if (inversion === "third") return tones[3] || null;

  return tones[0] || null;
}

function generateQuestions({
  count = 10,
  chordTypes = ["major", "minor", "dom7"],
  keySignature = "C_major",
  inversionMode = "mixed",
}) {
  const safeTypes = chordTypes.filter((t) => CHORD_LIBRARY[t]);
  const finalTypes = safeTypes.length ? safeTypes : ["major", "minor", "dom7"];

  return Array.from({ length: count }).map((_, index) => {
    const type = sample(finalTypes);
    const root = buildRoot();
    const chordInfo = CHORD_LIBRARY[type];
    const inversion = pickInversion(type, inversionMode);

    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      index: index + 1,
      type,
      typeLabel: chordInfo.label,
      root,
      keySignature,
      keyLabel: getKeyLabel(keySignature),
      inversion,
      inversionLabel: getInversionLabel(inversion),
      prompt: `请弹出：${root}${chordInfo.suffix}`,
      displayName: `${root}${chordInfo.suffix}`,
      correctAnswer: {
  root,
  type,
  displayName: `${root}${chordInfo.suffix}`,
  tones: buildChordToneSet(root, type),
},
    };
  });
}

async function getSession(sessionId) {
  return await redis.get(`session:${sessionId}`);
}

async function saveSession(sessionId, data) {
  await redis.set(`session:${sessionId}`, data, { ex: 60 * 60 * 8 });
}

function buildQuestionStats(questions = []) {
  const map = {};
  for (const q of questions) {
    map[q.id] = {
      questionId: q.id,
      index: q.index,
      prompt: q.prompt,
      displayName: q.displayName,
      type: q.type,
      typeLabel: q.typeLabel,
      total: 0,
      correct: 0,
      rate: 0,
    };
  }
  return map;
}

function getChordTypeLabel(type) {
  return CHORD_LIBRARY[type]?.label || type;
}

function buildStudentFeedback(student) {
  const answers = Array.isArray(student.answers) ? student.answers : [];
  const totalAnswered = answers.length;
  const correctCount = student.correctCount || 0;
  const accuracy =
    totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  const wrongTypeCount = {};
  for (const item of answers) {
    if (!item.isCorrect) {
      wrongTypeCount[item.type] = (wrongTypeCount[item.type] || 0) + 1;
    }
  }

  const weakTypes = Object.entries(wrongTypeCount)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type)
    .slice(0, 2);

  let level = "good";
  if (accuracy >= 90) {
    level = "excellent";
  } else if (accuracy >= 75) {
    level = "good";
  } else if (accuracy >= 60) {
    level = "developing";
  } else {
    level = "needsFocus";
  }

  let summary = "";
  let suggestion = "";
  let focus = "";

  if (level === "excellent") {
    summary = "你本轮和弦辨认非常稳定，已经具备较强的和弦听想与键盘反应能力。";
    suggestion = "建议下一步增加转位干扰、混合七和弦和限时训练，继续提升反应速度与迁移能力。";
  } else if (level === "good") {
    summary = "你已经掌握了大部分和弦判断，整体表现良好，基础较稳。";
    suggestion = "建议继续巩固易混淆和弦，并加入根音变化练习，提高不同调上的识别稳定性。";
  } else if (level === "developing") {
    summary = "你已经建立了基本的和弦识别能力，但稳定性还需要继续加强。";
    suggestion = "建议先分类型反复练习，再逐步进行混合题训练，提升判断准确率。";
  } else {
    summary = "你当前还处在和弦识别能力建立阶段，需要更多针对性训练。";
    suggestion = "建议从大三、小三和弦开始单独练习，先熟悉音程结构，再过渡到七和弦。";
  }

  if (weakTypes.length > 0) {
    focus = `当前相对薄弱的类型：${weakTypes.map(getChordTypeLabel).join("、")}。`;
  } else {
    focus = "本轮未出现明显集中错误类型，整体识别较均衡。";
  }

  let nextStep = "";
  if (weakTypes.includes("maj7") || weakTypes.includes("min7") || weakTypes.includes("dom7")) {
    nextStep += "建议重点比较三和弦与七和弦的音响层次差异。";
  }
  if (weakTypes.includes("dim") || weakTypes.includes("aug")) {
    nextStep += " 可增加增减和弦的对比练习，强化特殊色彩和声音程记忆。";
  }
  if (!nextStep) {
    nextStep = "建议继续保持每日短时、高频的和弦弹奏与听辨结合训练。";
  }

  return {
    totalAnswered,
    correctCount,
    accuracy,
    level,
    weakTypes,
    summary,
    focus,
    suggestion,
    nextStep,
    updatedAt: Date.now(),
  };
}

function buildClassFeedback(session) {
  const students = Array.isArray(session.students) ? session.students : [];
  const finishedStudents = students.filter(
    (student) => student.feedback && student.feedback.totalAnswered >= 10
  );

  if (finishedStudents.length === 0) {
    return null;
  }

  const averageAccuracy = Math.round(
    finishedStudents.reduce(
      (sum, student) => sum + (student.feedback?.accuracy || 0),
      0
    ) / finishedStudents.length
  );

  const weakTypeCount = {};
  for (const student of finishedStudents) {
    const weakTypes = Array.isArray(student.feedback?.weakTypes)
      ? student.feedback.weakTypes
      : [];
    for (const type of weakTypes) {
      weakTypeCount[type] = (weakTypeCount[type] || 0) + 1;
    }
  }

  const commonWeakTypes = Object.entries(weakTypeCount)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type)
    .slice(0, 3);

  let noteErrorCount = 0;
  let bassErrorCount = 0;

  for (const student of students) {
    for (const item of student.answers || []) {
      if (!item.isCorrect) {
        if (item.noteSetCorrect && item.bassCorrect === false) {
          bassErrorCount += 1;
        } else {
          noteErrorCount += 1;
        }
      }
    }
  }

  let summary = `当前已有 ${finishedStudents.length} 名学生完成本轮训练，班级平均正确率为 ${averageAccuracy}%。`;

if (commonWeakTypes.length > 0) {
  summary += ` 班级共性薄弱点集中在：${commonWeakTypes
    .map(getChordTypeLabel)
    .join("、")}。`;
} else {
  summary += " 班级整体错误分布较均衡。";
}

if (noteErrorCount > 0 || bassErrorCount > 0) {
  summary += ` 其中，和弦构成错误 ${noteErrorCount} 次，低音/转位错误 ${bassErrorCount} 次。`;
}

  return {
    finishedCount: finishedStudents.length,
    averageAccuracy,
    commonWeakTypes,
    noteErrorCount,
    bassErrorCount,
    summary,
    updatedAt: Date.now(),
  };
}

function summarizeStudent(student, totalQuestions) {
  const answeredCount = student.answers?.length || 0;
  const correctCount = student.correctCount || 0;
  const wrongCount = student.wrongCount || 0;
  const accuracy =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  let noteErrorCount = 0;
  let bassErrorCount = 0;

  const weakTypeMap = {};
for (const item of student.answers || []) {
  if (!item.isCorrect) {
    weakTypeMap[item.typeLabel] = (weakTypeMap[item.typeLabel] || 0) + 1;

    if (item.noteSetCorrect && item.bassCorrect === false) {
      bassErrorCount += 1;
    } else {
      noteErrorCount += 1;
    }
  }
}

  const weakTypes = Object.entries(weakTypeMap)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key)
    .slice(0, 2);

  return {
    studentId: student.studentId,
    name: student.name,
    joinedAt: student.joinedAt,
    lastActiveAt: student.lastActiveAt,
    answeredCount,
    progress: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0,
    accuracy,
    correctCount,
    wrongCount,
    weak: weakTypes.length ? weakTypes.join("、") : "—",
    currentQuestionIndex: student.currentQuestionIndex || 0,
    noteErrorCount,
    bassErrorCount,
    feedback: student.feedback || null,
  };
}

function toTeacherSession(session) {
  const totalQuestions = session.questions?.length || 0;
  const students = (session.students || []).map((student) =>
    summarizeStudent(student, totalQuestions)
  );

  const chartData = (session.questions || []).map((q) => {
    const stat = session.stats?.byQuestion?.[q.id];
    return {
      name: `Q${q.index}`,
      rate: stat?.rate || 0,
      total: stat?.total || 0,
      correct: stat?.correct || 0,
      displayName: q.displayName,
    };
  });

  return {
    ...session,
    students,
    chartData,
    classFeedback: buildClassFeedback(session),
  };
}

function toPublicSession(session) {
  return {
    sessionId: session.sessionId,
    status: session.status,
    keySignature: session.keySignature || "C_major",
    keyLabel: session.keyLabel || getKeyLabel("C_major"),
    createdAt: session.createdAt,
    startedAt: session.startedAt || null,
    currentQuestionIndex: session.currentQuestionIndex ?? 0,
    totalQuestions: session.questions?.length || 0,
    currentQuestion:
      session.questions && session.questions.length > 0
        ? {
            id: session.questions[session.currentQuestionIndex || 0]?.id,
            index: session.questions[session.currentQuestionIndex || 0]?.index,
            prompt: session.questions[session.currentQuestionIndex || 0]?.prompt,
            displayName: session.questions[session.currentQuestionIndex || 0]?.displayName,
            type: session.questions[session.currentQuestionIndex || 0]?.type,
            typeLabel: session.questions[session.currentQuestionIndex || 0]?.typeLabel,
            root: session.questions[session.currentQuestionIndex || 0]?.root,
          }
        : null,
  };
}

function toStudentSession(session, student) {
  const totalQuestions = session.questions?.length || 0;
  const currentIndex = student.currentQuestionIndex || 0;
  const currentQuestion =
    currentIndex < totalQuestions ? session.questions[currentIndex] : null;

  return {
    sessionId: session.sessionId,
    status: session.status,
    studentId: student.studentId,
    name: student.name,
    keySignature: session.keySignature || "C_major",
    keyLabel: session.keyLabel || getKeyLabel("C_major"),
    inversionMode: session.inversionMode || "mixed",
    inversionLabel: session.inversionLabel || getInversionLabel("mixed"),
    totalQuestions,
    currentQuestionIndex: currentIndex,
    completedCount: student.answers?.length || 0,
    correctCount: student.correctCount || 0,
    wrongCount: student.wrongCount || 0,
    isFinished: currentIndex >= totalQuestions && totalQuestions > 0,
    currentQuestion: currentQuestion
      ? {
          id: currentQuestion.id,
          index: currentQuestion.index,
          prompt: currentQuestion.prompt,
          displayName: currentQuestion.displayName,
          type: currentQuestion.type,
          typeLabel: currentQuestion.typeLabel,
          root: currentQuestion.root,
          inversion: currentQuestion.inversion,
          inversionLabel: currentQuestion.inversionLabel,
        }
      : null,
    lastAnswer:
      student.answers && student.answers.length > 0
        ? student.answers[student.answers.length - 1]
        : null,
    feedback: student.feedback || null,
  };
}

app.post("/api/session/create", async (req, res) => {
  try {
    let sessionId = makeSessionId();

    while (await getSession(sessionId)) {
      sessionId = makeSessionId();
    }

    const session = {
      sessionId,
      status: "waiting",
      createdAt: new Date().toISOString(),
      startedAt: null,
      currentQuestionIndex: 0,
      questions: [],
      students: [],
      stats: {
        byQuestion: {},
      },
    };

    await saveSession(sessionId, session);

    res.json({
      ok: true,
      sessionId,
      session,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/session/:sessionId/start", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
  chordTypes = ["major", "minor", "dom7"],
  keySignature = "C_major",
  inversionMode = "mixed",
  count = 10,
} = req.body || {};

    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      });
    }

    const questions = generateQuestions({
  chordTypes,
  keySignature,
  inversionMode,
  count,
});

    const nextSession = {
      ...session,
      status: "running",
      startedAt: new Date().toISOString(),
      currentQuestionIndex: 0,
      keySignature,
      keyLabel: getKeyLabel(keySignature),
      inversionMode,
      inversionLabel: getInversionLabel(inversionMode),
      questions,
      stats: {
        byQuestion: buildQuestionStats(questions),
      },
      students: (session.students || []).map((student) => ({
        ...student,
        currentQuestionIndex: 0,
        answers: [],
        correctCount: 0,
        wrongCount: 0,
        feedback: null,
      })),
    };

    await saveSession(sessionId, nextSession);

    res.json({
      ok: true,
      session: toTeacherSession(nextSession),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/session/:sessionId/join", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const name = String(req.body?.name || "").trim();

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: "姓名不能为空",
      });
    }

    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      });
    }

    let student = (session.students || []).find((item) => item.name === name);

    if (!student) {
      student = {
  studentId: makeStudentId(),
  name,
  joinedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  currentQuestionIndex: 0,
  answers: [],
  correctCount: 0,
  wrongCount: 0,
  feedback: null,
};

      session.students = [...(session.students || []), student];
    } else {
      student.lastActiveAt = new Date().toISOString();
      session.students = (session.students || []).map((item) =>
        item.studentId === student.studentId ? student : item
      );
    }

    await saveSession(sessionId, session);

    res.json({
      ok: true,
      studentId: student.studentId,
      studentSession: toStudentSession(session, student),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/session/:sessionId/student/:studentId", async (req, res) => {
  try {
    const { sessionId, studentId } = req.params;
    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      });
    }

    const student = (session.students || []).find((item) => item.studentId === studentId);

    if (!student) {
      return res.status(404).json({
        ok: false,
        error: "Student not found",
      });
    }

    res.json({
      ok: true,
      studentSession: toStudentSession(session, student),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/session/:sessionId/answer", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentId, notes = [], keyIds = [] } = req.body || {};

    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      });
    }

    const studentIndex = (session.students || []).findIndex(
      (item) => item.studentId === studentId
    );

    if (studentIndex === -1) {
      return res.status(404).json({
        ok: false,
        error: "Student not found",
      });
    }

    const student = session.students[studentIndex];
    const questionIndex = student.currentQuestionIndex || 0;
    const totalQuestions = session.questions?.length || 0;

    if (questionIndex >= totalQuestions) {
      return res.status(400).json({
        ok: false,
        error: "已经全部完成",
      });
    }

    const question = session.questions[questionIndex];
    const existing = (student.answers || []).find(
      (item) => item.questionId === question.id
    );

    if (existing) {
      return res.status(400).json({
        ok: false,
        error: "当前题目已经提交过了",
      });
    }

    const expectedNotes = question.correctAnswer?.tones || [];
const normalizedPlayedNotes = normalizeNoteArray(notes).map(
  (value) => SEMITONE_TO_NOTE[value]
);

const noteSetCorrect = areSameNoteSet(notes, expectedNotes);

const sortedKeyIds = Array.isArray(keyIds)
  ? [...keyIds].sort((a, b) => parseKeyOrder(a) - parseKeyOrder(b))
  : [];

const bassKeyId = sortedKeyIds[0] || null;
const bassNoteFromKeyId = bassKeyId
  ? bassKeyId.split("-")[1] || null
  : null;

const expectedBassNote = getExpectedBassNote(
  expectedNotes,
  question.inversion || "root"
);

const bassCorrect =
  !expectedBassNote || !bassNoteFromKeyId
    ? false
    : normalizeNote(expectedBassNote) === normalizeNote(bassNoteFromKeyId);

const isCorrect = noteSetCorrect && bassCorrect;

    const answerRecord = {
      questionId: question.id,
      questionIndex: question.index,
      prompt: question.prompt,
      displayName: question.displayName,
      type: question.type,
      typeLabel: question.typeLabel,
      inversion: question.inversion || "root",
      inversionLabel: question.inversionLabel || getInversionLabel("root"),
      bassNote: bassNoteFromKeyId,
      expectedBassNote,
      noteSetCorrect,
      bassCorrect,
      answer: Array.isArray(notes) ? notes.join("-") : "",
      playedNotes: normalizedPlayedNotes,
      expectedNotes,
      isCorrect,
      submittedAt: new Date().toISOString(),
    };

    student.answers = [...(student.answers || []), answerRecord];
    student.correctCount = (student.correctCount || 0) + (isCorrect ? 1 : 0);
    student.wrongCount = (student.wrongCount || 0) + (isCorrect ? 0 : 1);
    student.currentQuestionIndex = (student.currentQuestionIndex || 0) + 1;
    student.lastActiveAt = new Date().toISOString();

    if ((student.answers?.length || 0) >= 10) {
      student.feedback = buildStudentFeedback(student);
    }

    const stat = session.stats?.byQuestion?.[question.id];
    if (stat) {
      stat.total += 1;
      stat.correct += isCorrect ? 1 : 0;
      stat.rate = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    }

    session.students[studentIndex] = student;
    await saveSession(sessionId, session);

    res.json({
  ok: true,
  isCorrect,
  correctAnswer: question.correctAnswer?.tones || [],
  noteSetCorrect,
  bassCorrect,
  expectedBassNote,
  inversion: question.inversion || "root",
  inversionLabel: question.inversionLabel || getInversionLabel("root"),
  studentSession: toStudentSession(session, student),
  teacherSession: toTeacherSession(session),
});
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/session/:sessionId/public", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      });
    }

    res.json({
      ok: true,
      session: toPublicSession(session),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/session/:sessionId/teacher", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      });
    }

    res.json({
      ok: true,
      session: toTeacherSession(session),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});