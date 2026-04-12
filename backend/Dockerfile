# --- Build stage: install dependencies ---
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Production stage ---
FROM python:3.12-slim
WORKDIR /app

# Install pg_isready for database readiness check
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Security: run as non-root user
RUN groupadd --system appuser && useradd --system --gid appuser appuser

# Copy only installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Entrypoint runs DB wait + Alembic migrations before app start
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

EXPOSE 8000

STOPSIGNAL SIGTERM

LABEL org.opencontainers.image.source="https://github.com/exploreiot/dashboard"
LABEL org.opencontainers.image.description="ExploreIOT Dashboard Backend API"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
