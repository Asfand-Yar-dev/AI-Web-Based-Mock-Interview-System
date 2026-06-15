# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Intervexa — a Smart Mock Interview System (FYP). Three independent services run together:

| Service | Tech | Default port | Start command |
|---|---|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind 4 (pnpm) | 3000 | `pnpm dev` (repo root) |
| Backend API | Express 5 + Mongoose 9 (npm) | 5000 | `npm run dev` (in `backend/`) |
| AI Gateway | Python Flask, orchestrates Whisper / NLP / Voice / Facial models | 8000 | `python ai_gateway/app.py` |

The root `package.json` is the frontend. The backend is a separate npm project in `backend/`. The Python AI services are sibling directories (`STT_Model/`, `NLP_Evaluation/`, `Voice_Model/`, `Facial_Model/`, `Answer_Generation/`, `Fusion Model/`) that `ai_gateway/app.py` imports by injecting their paths onto `sys.path` — don't move those folders without updating `ai_gateway/app.py`.

## First-time setup

1. **MongoDB must be running** (local `:27017` or Atlas via `MONGO_URI`). Backend will not start without it.
2. **Pre-download Whisper** before first AI request, otherwise the first transcription will block while downloading:
   ```
   python STT_Model/setup_model.py --model-size base
   ```
3. **Fill `.env` files** (don't commit them):
   - `backend/.env` — `PORT`, `MONGO_URI`, `JWT_SECRET` (64+ chars), `AI_SERVICE_URL=http://localhost:8000`, `GEMINI_API_KEY`, `CORS_ORIGIN=http://localhost:3000`. See `backend/config/constants.js` for the full set.
   - `ai_gateway/.env` — copy from `ai_gateway/.env.example`. Needs `GROQ_API_KEY` and `WHISPER_MODEL_SIZE`.
   - `.env.local` at repo root for frontend — `NEXT_PUBLIC_API_URL=http://localhost:5000`.

## Startup order

Backend → AI Gateway → Frontend. The backend calls the gateway at `AI_SERVICE_URL`; the frontend calls the backend at `NEXT_PUBLIC_API_URL`. Starting in any other order means the first requests fail until upstream is ready.

## Gotchas

- **Wav2Vec2 + LM Studio conflict**: don't run the voice model and LM Studio at the same time — they fight for VRAM/RAM.
- **`backend/package.json` `lint` and `test` are placeholders** (`echo … && exit 0`). Real ESLint/Jest setup is a Phase 6 task — don't trust a green `npm test` as evidence of anything.
- **Root `pnpm lint` runs `eslint .` but there is no ESLint config file** in the repo. The script will fail until one is added.
- **Stripe is stubbed** in `backend/services/paymentService.js` — real API calls are commented out, and the `stripe` package isn't installed. Treat payment flows as non-functional until both are addressed.
- **Live interview recordings save to `backend/uploads/live-recordings/` on local disk** — no S3/object storage yet.
- **No-show scheduler** (`backend/services/noShowScheduler.js`) isn't wired into an automatic loop; it has to be triggered explicitly.
- **MongoDB sanitization**: `express-mongo-sanitize` is wired into `backend/server.js` — don't bypass it when adding routes.

## Project status

Phase 5 (Python AI microservices via `ai_gateway`) is the active work, on branch `ai-fix`. `Doc/STATUS_REPORT.md` tracks phase progress; `Doc/premium_live_interview_architecture.md` covers the WebRTC + payment + async AI pipeline design. Some `Doc/architecture.md` files are UTF-16 encoded and won't read cleanly.

## Conventions

- Frontend uses **pnpm**, backend uses **npm** — don't mix lockfiles.
- Backend is **CommonJS** (`"type": "commonjs"`), not ESM.
- TypeScript is used in the frontend (`app/`, `components/`, `lib/`, `hooks/`); backend and AI services are plain JS / Python.
- Question category strings are lowercase — see the note in `backend/config/constants.js` about the shared schema between `Question` and `InterviewSession`.
