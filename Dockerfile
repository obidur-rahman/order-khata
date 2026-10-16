# syntax=docker/dockerfile:1
#
# One container serves the API and the static frontend on port 7860 (docs/02 §1,
# README front matter: sdk: docker, app_port: 7860).
#
#   stage 1  build the Next.js static export  (needs Node)
#   stage 2  FastAPI + uvicorn, serving frontend/out at "/"  (no Node in the image)
#
# NOTE: not verified with a local Docker build — Docker is unavailable on the dev
# machine this was written on. Review before the first Space deploy.

# ---------------------------------------------------------------------------
# stage 1 — static frontend
# ---------------------------------------------------------------------------
FROM node:22-slim AS frontend
WORKDIR /build/frontend
# package files first so `npm ci` is cached until dependencies actually change
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# output: "export" in next.config.ts -> ./out (docs/02 §2: no SSR, no optimizer)
RUN npm run build

# ---------------------------------------------------------------------------
# stage 2 — runtime
# ---------------------------------------------------------------------------
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first: the layer survives every source edit.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend /build/frontend/out ./frontend/out

# backend/data is gitignored (splits, seed pool, SQLite file), so it may not
# exist in the build context at all. db.init_db() creates it too; this is here
# so the container is writable even before the first request.
RUN mkdir -p backend/data

EXPOSE 7860

# Single process: the SQLite file is per-container, and one worker keeps the
# LLM cache and simulator in the same process as the requests that use them.
CMD ["uvicorn", "app.main:app", "--app-dir", "backend", \
     "--host", "0.0.0.0", "--port", "7860"]
