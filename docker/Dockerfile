# ── Stage 1: build dependencies ──────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build tools needed for psycopg2 and openpyxl C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime image ────────────────────────────────────────────────
FROM python:3.11-slim

# Zona horaria Colombia / Ecuador (UTC-5, sin horario de verano)
ENV TZ=America/Bogota
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Runtime deps only (libpq para psycopg2, tzdata para zona horaria)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        tzdata \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ ./app/
COPY migrations/ ./migrations/
COPY alembic.ini .
COPY docker/scripts/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
