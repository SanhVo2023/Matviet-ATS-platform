# LibreOffice headless DOCX → PDF conversion worker
# Deployed to Fly.io by Sanh; called by the score-candidate Edge Function
# when a candidate uploads a DOCX (cv_files.pdf_storage_path == null).
FROM debian:bookworm-slim

# 1. System deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-core \
      libreoffice-writer \
      libreoffice-common \
      fonts-noto \
      fonts-liberation \
      curl \
      ca-certificates \
      gnupg \
 && rm -rf /var/lib/apt/lists/*

# 2. Node 20 (Express server)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js ./

ENV PORT=8080
EXPOSE 8080

# Run as non-root for safety
RUN useradd -m -u 1001 worker && chown -R worker:worker /app
USER worker

CMD ["node", "server.js"]
