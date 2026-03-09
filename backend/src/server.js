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
  maj7: { label: "大七和弦", suffix: "maj7" },
  min7: { label: "小七和弦", suffix: "m7" },
  dom7: { label: "属七和弦", suffix: "7" },
};

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildRoot() {
  return `${sample(ROOTS)}${sample(ACCIDENTALS)}`;
}

function normalizeAnswer(value = "") {
  return String(value).trim().replace(/\s+/g, "").toLowerCase();
}

function generateQuestions({ count = 10, chordTypes = ["major", "minor", "dom7"] }) {
  const safeTypes = chordTypes.filter((t) => CHORD_LIBRARY[t]);
  const finalTypes = safeTypes.length ? safeTypes : ["major", "minor", "dom7"];

  return Array.from({ length: count }).map((_, index) => {
    const type = sample(finalTypes);
    const root = buildRoot();
    const chordInfo = CHORD_LIBRARY[type];

    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      index: index + 1,
      type,
      typeLabel: chordInfo.label,
      root,
      prompt: `请弹出：${root}${chordInfo.suffix}`,
      displayName: `${root}${chordInfo.suffix}`,
      correctAnswer: {
        root,
        type,
        displayName: `${root}${chordInfo.suffix}`,
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

function summarizeStudent(student, totalQuestions) {
  const answeredCount = student.answers?.length || 0;
  const correctCount = student.correctCount || 0;
  const wrongCount = student.wrongCount || 0;
  const accuracy =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const weakTypeMap = {};
  for (const item of student.answers || []) {
    if (!item.isCorrect) {
      weakTypeMap[item.typeLabel] = (weakTypeMap[item.typeLabel] || 0) + 1;
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
  };
}

function toPublicSession(session) {
  return {
    sessionId: session.sessionId,
    status: session.status,
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
        }
      : null,
    lastAnswer:
      student.answers && student.answers.length > 0
        ? student.answers[student.answers.length - 1]
        : null,
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
    const { chordTypes = ["major", "minor", "dom7"], count = 10 } = req.body || {};

    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      });
    }

    const questions = generateQuestions({ chordTypes, count });

    const nextSession = {
      ...session,
      status: "running",
      startedAt: new Date().toISOString(),
      currentQuestionIndex: 0,
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
    const { studentId, answer } = req.body || {};

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

    const isCorrect =
      normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer.displayName);

    const answerRecord = {
      questionId: question.id,
      questionIndex: question.index,
      prompt: question.prompt,
      displayName: question.displayName,
      type: question.type,
      typeLabel: question.typeLabel,
      answer: String(answer || ""),
      isCorrect,
      submittedAt: new Date().toISOString(),
    };

    student.answers = [...(student.answers || []), answerRecord];
    student.correctCount = (student.correctCount || 0) + (isCorrect ? 1 : 0);
    student.wrongCount = (student.wrongCount || 0) + (isCorrect ? 0 : 1);
    student.currentQuestionIndex = (student.currentQuestionIndex || 0) + 1;
    student.lastActiveAt = new Date().toISOString();

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
      result: {
        isCorrect,
        correctAnswer: question.correctAnswer.displayName,
      },
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