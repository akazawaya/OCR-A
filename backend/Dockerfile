FROM python:3.13.11-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock ./

FROM base AS development

RUN uv sync --locked --extra gpu --no-cache

COPY . .

FROM base AS production-cpu

RUN uv sync --locked --no-dev --no-cache

COPY . .

FROM base AS production-gpu

RUN uv sync --locked --no-dev --extra gpu --no-cache

COPY . .
