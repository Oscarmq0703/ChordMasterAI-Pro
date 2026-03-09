import express from "express";
import cors from "cors";
import { redis } from "./redis.js";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "ChordMasterAI Pro backend is running",
  });
});

app.get("/health", async (req, res) => {
  try {
    res.json({
      ok: true,
      service: "chordmasterai-backend",
      time: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
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

function toPublicSession(session) {
  if (!session) return null;

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
      stats: {},
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
    };

    await saveSession(sessionId, nextSession);

    res.json({
      ok: true,
      session: nextSession,
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
      session,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});