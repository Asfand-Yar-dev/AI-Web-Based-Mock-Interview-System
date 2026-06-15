---
name: dev-up
description: Print the correct local startup sequence for Intervexa (MongoDB → Whisper pre-download → backend → ai_gateway → frontend) with health checks. Use when the user wants to bring up the dev environment or asks "how do I start everything".
disable-model-invocation: true
---

Walk the user through starting the full Intervexa dev stack, in order. Do not start services yourself — print the commands and the health check for each step so the user runs them in separate terminals.

## 1. MongoDB

Make sure MongoDB is running. Either local Mongo on `:27017` or Atlas via `MONGO_URI` in `backend/.env`. Without this, the backend will not start.

Quick check (local):
```
mongosh --eval "db.runCommand({ping: 1})"
```

## 2. Whisper model (one-time)

Only needed the first time on a machine, or after switching `WHISPER_MODEL_SIZE`. Skip if `STT_Model/models/` already has the right model.

```
python STT_Model/setup_model.py --model-size base
```

Tradeoff: `base` ~1 GB RAM, `medium` ~5 GB. Match what's in `ai_gateway/.env` (`WHISPER_MODEL_SIZE`).

## 3. Backend (Terminal 1)

```
cd backend
npm run dev
```

Health check (separate shell): `curl http://localhost:5000/health` (or whichever health route is registered in `backend/server.js`). Wait for Mongo connect log before moving on.

## 4. AI Gateway (Terminal 2)

```
python ai_gateway/app.py
```

Listens on `:8000`. First request will be slow if Whisper wasn't pre-downloaded in step 2.

Warning: don't have **LM Studio running at the same time as the voice model** — Wav2Vec2 and LM Studio compete for VRAM/RAM and one of them will OOM.

## 5. Frontend (Terminal 3)

```
pnpm dev
```

Open `http://localhost:3000`. Frontend expects backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:5000`).

## If something is wrong

- Frontend loads but API calls 404/CORS-fail → backend isn't up, or `CORS_ORIGIN` in `backend/.env` doesn't match `http://localhost:3000`.
- Backend logs "AI service timeout" → ai_gateway isn't up, or `AI_SERVICE_URL` in `backend/.env` is wrong.
- Whisper transcription hangs on first request → step 2 wasn't done. Cancel, run `setup_model.py`, retry.
- Backend won't start → MongoDB isn't running or `MONGO_URI` is wrong.
