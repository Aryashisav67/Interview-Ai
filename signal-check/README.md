# Signal Check

A voice-based technical interview tool. Paste a GitHub profile, talk through
a live AI interview grounded in your public repos, get a scored transcript
at the end.

This is a redesigned rebuild of [code100x/ai-interviewer](https://github.com/code100x/ai-interviewer)
(the interview built in [this video by Harkirat Singh](https://www.youtube.com/watch?v=iNJ7z4YLQFk)) —
same architecture and flow, different visual identity: a broadcast/audio-console
look (patch inputs, segmented LED meters, rack-channel labels) instead of the
original's dark gradient-orb UI, since the app is literally reading live mic
and AI voice levels.

```
apps/
  backend/    Express API — scrapes GitHub, brokers the WebRTC call to
              OpenAI's Realtime API, scores the finished interview with Gemini
  frontend/   Bun + React app — the three-screen flow (source → live → readout)
```

## Requirements

- [Bun](https://bun.sh) v1.1+
- A Postgres database (`npx create-db` gives you a free hosted one in seconds)
- An OpenAI API key with Realtime API (`gpt-realtime`) access
- A Google Gemini API key (used only to score the finished interview)
- Optional: a Deepgram API key, for live transcription of *your own* mic
  while you talk (the AI's side is always transcribed server-side)

## Setup

```bash
git clone <your-fork-url> signal-check
cd signal-check

# Backend
cd apps/backend
bun install
cp .env.example .env      # fill in DATABASE_URL, OPENAI_KEY, GEMINI_API_KEY
bun run db:generate
bun run db:migrate
bun run dev                # http://localhost:3001

# Frontend, in a second terminal
cd apps/frontend
bun install
cp .env.example .env      # BACKEND_URL, optional DEEPGRAM_KEY
bun run dev                # http://localhost:3000
```

Open the frontend URL, drop in a GitHub profile, and go live.

## Pushing this to your own GitHub

```bash
# from the signal-check folder
git init
git add .
git commit -m "Signal Check"
git branch -M main
git remote add origin https://github.com/<your-username>/signal-check.git
git push -u origin main
```

(Create the empty `signal-check` repo on GitHub first, or swap in `gh repo create`
if you have the GitHub CLI installed.)

## Notes on the original vs. this version

- Functionally the same: GitHub scrape → `pre-interview` record → WebRTC
  handshake proxied to OpenAI Realtime → live level-metered voice interview →
  Gemini-scored transcript.
- The GitHub scrape's proxy (`PROXY_URL`) is now optional — it calls the
  GitHub API directly if unset.
- The client-side Deepgram key is still a plain env var shipped to the
  browser, same as upstream — fine for a personal project, but swap it for a
  short-lived server-minted token before you'd want this multi-tenant.
- Full visual redesign: new color system, typography, and every component
  restyled around the console/rack metaphor — see `apps/frontend/styles/globals.css`.
