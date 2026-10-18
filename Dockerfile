# syntax=docker/dockerfile:1
#
# One container serves the API and the static frontend on port 7860 (docs/02 §1,
# README front matter: sdk: docker, app_port: 7860).
#
#   stage 1  build the Next.js static export  (needs Node)
#   stage 2  FastAPI + uvicorn, serving frontend/out at "/"  (no Node in the image)
#
# NOTE: still not verified with a local Docker build — Docker is unavailable on
# the dev machine this was written on. The Laya stage's pieces were each checked
# without one: `torch-2.14.0+cpu-cp311-cp311-manylinux_2_28_x86_64.whl` is on the
# CPU index, `laya-0.4.8-py3-none-any.whl` requires >=3.10, so the pins resolve on
# python:3.11-slim. The first person with Docker should build it and watch for a
# missing shared library rather than trusting this note.

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

# Dependencies first: the layer survives every source edit. Both requirement
# files go in together — the LayA install below reads its own file, and the full
# `COPY backend/ ./backend/` only happens near the end (a build failed with
# "No such file or directory: backend/requirements-laya.txt" when this copied
# only requirements.txt).
COPY backend/requirements.txt backend/requirements-laya.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# ---------------------------------------------------------------------------
# Engine A's opt-in half — the Laya checkpoint (docs/04 §2.1–2.2)
# ---------------------------------------------------------------------------
# Kept out of requirements.txt on purpose: this image *can* run the checkpoint, a
# bare `pip install -r backend/requirements.txt` cannot, and both are supported
# states that /api/health and /api/config report. Installing it here is what makes
# the checkpoint selectable: nothing loads it at boot, and a host too small to hold
# it is refused before torch is even imported.
#
# torch comes from the CPU wheel index. The Space has no GPU, and the PyPI build
# is ~2.5 GB of CUDA libraries that could never be used. It goes in on its own
# line, before laya, so laya sees torch already satisfied and does not pull it.
# libgomp1 is torch's OpenMP runtime; python:slim does not always carry it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.14.0 \
    && pip install --no-cache-dir -r backend/requirements-laya.txt

# The weights (644 MB) are fetched at build time, not on the first request of
# every restart: a Free Space is ephemeral, and a cold start that races a
# customer message for a network download is not a demo. HF_HOME is set first so
# the cache lands in a layer that survives. If the checkpoint is ever gated, pass
# a token as a BuildKit secret — an ARG would leave it in the image history.
ENV HF_HOME=/opt/hf-cache \
    HF_HUB_DISABLE_TELEMETRY=1
RUN python -c "from huggingface_hub import snapshot_download; \
    snapshot_download('nafiullah/laya-multilingual-bn-ecom-voice')"
# Once the weights are baked in, boot must never depend on huggingface.co
# again: a failed Hub revision check at startup is exactly how a local server
# ended up reporting the engine as "not available in this deployment" while
# the 644 MB checkpoint sat in the cache untouched. With the snapshot present,
# offline mode degrades honestly (load error -> tfidf-lr) instead of flaking.
ENV HF_HUB_OFFLINE=1

COPY backend/ ./backend/
COPY --from=frontend /build/frontend/out ./frontend/out

# backend/data is gitignored (splits, seed pool, SQLite file), so it may not
# exist in the build context at all. db.init_db() creates it too; this is here
# so the container is writable even before the first request.
RUN mkdir -p backend/data

EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-7860}"]
