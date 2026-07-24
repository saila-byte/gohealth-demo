// Express server for the GoHealth × Tavus onboarding demo.
//
// Responsibilities:
//   1. POST /api/tavus - create/end a Tavus conversation (API key stays server-side)
//   2. Serves the built React app (dist/) in production
//
// Keep TAVUS_API_KEY only here, never in client code.

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;
const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const TAVUS_PERSONA_ID = process.env.TAVUS_PERSONA_ID;
const TAVUS_API_BASE = "https://tavusapi.com/v2";

if (!TAVUS_API_KEY) {
  console.warn(
    "[warn] TAVUS_API_KEY is not set. Set it in your environment or .env file."
  );
}

if (!TAVUS_PERSONA_ID) {
  console.warn(
    "[warn] TAVUS_PERSONA_ID is not set. Add Alex's persona/pal id to your .env file."
  );
}

app.use(cors());
app.use(express.json());

app.post("/api/tavus", async (req, res) => {
  if (!TAVUS_API_KEY) {
    return res
      .status(500)
      .json({ error: "TAVUS_API_KEY is not set on the server." });
  }

  const {
    action,
    conversational_context,
    conversation_name,
    conversationId,
  } = req.body || {};

  if (action === "create") {
    if (!TAVUS_PERSONA_ID) {
      return res
        .status(500)
        .json({ error: "TAVUS_PERSONA_ID is not set on the server." });
    }

    if (
      !conversational_context ||
      typeof conversational_context !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "conversational_context is required." });
    }

    const body = {
      pal_id: TAVUS_PERSONA_ID,
      conversation_name: conversation_name || "GoHealth Onboarding Demo",
      conversational_context,
      properties: {
        max_call_duration: 600,
        participant_left_timeout: 30,
      },
    };

    try {
      const r = await fetch(`${TAVUS_API_BASE}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": TAVUS_API_KEY,
        },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      return res.json(data);
    } catch (err) {
      return res.status(502).json({ error: String(err) });
    }
  }

  if (action === "end" && conversationId) {
    try {
      const r = await fetch(
        `${TAVUS_API_BASE}/conversations/${conversationId}/end`,
        {
          method: "POST",
          headers: { "x-api-key": TAVUS_API_KEY },
        }
      );
      if (r.status === 204) return res.status(204).send();
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(r.status).json(data);
      return res.json(data);
    } catch (err) {
      return res.status(502).json({ error: String(err) });
    }
  }

  return res.status(400).json({ error: "Unknown action" });
});

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));
app.get("/{*splat}", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`GoHealth Tavus demo API listening on http://localhost:${PORT}`);
});
