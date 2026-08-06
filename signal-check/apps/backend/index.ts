import "dotenv/config";
import express from "express";
import cors from "cors";
import { PreInterviewBody } from "./types";
import { scrapeGithub } from "./scrapers/github";
import { prisma } from "./db";
import { initSideband } from "./sideband";
import { calculateResult } from "./result";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "*" }));
app.use(express.text({ type: ["application/sdp", "text/plain"] }));

// Step 1 — take a GitHub profile, scrape it, open an interview record.
app.post("/api/v1/pre-interview", async (req, res) => {
  const { success, data } = PreInterviewBody.safeParse(req.body);

  if (!success) {
    res.status(411).json({ message: "Incorrect body" });
    return;
  }

  const githubUrl = data.github.endsWith("/") ? data.github.slice(0, -1) : data.github;
  const githubUsername = githubUrl.split("/").pop()!;

  const githubData = await scrapeGithub(githubUsername);

  const interview = await prisma.interview.create({
    data: {
      githubMetadata: JSON.stringify(githubData),
      status: "Pre",
    },
  });

  res.json({ id: interview.id });
});

// Step 2 — WebRTC SDP handshake, proxied to OpenAI's Realtime API.
app.post("/api/v1/session/:interviewId", async (req, res) => {
  const sessionConfig = JSON.stringify({
    type: "realtime",
    model: "gpt-realtime",
    audio: { output: { voice: "marin" } },
  });

  const fd = new FormData();
  fd.set("sdp", req.body);
  fd.set("session", sessionConfig);

  try {
    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
        "OpenAI-Safety-Identifier": "hashed-user-id",
      },
      body: fd,
    });

    const location = sdpResponse.headers.get("Location");
    const callId = location?.split("/").pop()!;

    const sdp = await sdpResponse.text();
    res.send(sdp);

    initSideband(callId, req.params.interviewId);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Step 2b — store the candidate's own transcribed turns as they come in.
app.post("/api/v1/session/user/response/:interviewId", async (req, res) => {
  const { message } = req.body;
  await prisma.message.create({
    data: {
      interviewId: req.params.interviewId!,
      type: "User",
      message: message,
    },
  });

  res.json({ message: "Message saved" });
});

// Step 3 — poll for the scored result once the interview has ended.
app.get("/api/v1/result/:interviewId", async (req, res) => {
  const interview = await prisma.interview.findFirst({
    where: { id: req.params.interviewId },
    include: { conversations: true },
  });

  if (!interview) {
    res.status(411).json({ message: "Interview not found" });
    return;
  }

  res.json({
    score: interview.score,
    feedback: interview.feedback,
    transcript: interview.conversations.map((c) => ({
      type: c.type,
      content: c.message,
      createdAt: c.createdAt,
    })),
    status: interview.status,
  });

  if (interview.status !== "Done") {
    const result = await calculateResult(interview.conversations);

    await prisma.interview.update({
      where: { id: req.params.interviewId },
      data: {
        status: "Done",
        feedback: result.feedback,
        score: result.score,
      },
    });
  }
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => console.log(`Signal Check API listening on :${PORT}`));
