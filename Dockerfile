FROM node:26-bookworm-slim
WORKDIR /app
# Dépendances système pour canvas + yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    ffmpeg \
    curl \
    unzip \
    && ln -s /usr/bin/python3 /usr/local/bin/python \
    && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "index.js"]

