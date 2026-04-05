# ═══════════════════════════════════════════════════════════
# AlgoArena — Node.js Dockerfile
# Multi-stage: install deps → copy source → run
# ═══════════════════════════════════════════════════════════

FROM node:20-alpine AS deps
WORKDIR /app
COPY playground/server/package.json playground/server/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# ─── Production image ───
FROM node:20-alpine
WORKDIR /app

# Security: run as non-root with a proper home dir
RUN addgroup -S algoarena && adduser -S algoarena -G algoarena -h /home/algoarena \
    && mkdir -p /home/algoarena && chown algoarena:algoarena /home/algoarena

# Install language runtimes available in Alpine
# Python, GCC, G++, PHP, OpenJDK, .NET SDK, Go, Ruby
RUN apk add --no-cache \
    python3 \
    gcc g++ musl-dev \
    php83 \
    openjdk17-jdk \
    dotnet8-sdk \
    go \
    ruby \
    npm \
    coreutils \
    && ln -sf /usr/bin/php83 /usr/bin/php \
    && npm install -g typescript ts-node 2>/dev/null || true

# Copy node modules + source
COPY --from=deps /app/node_modules ./node_modules
COPY playground/server/package.json ./package.json
COPY playground/server/src ./src

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DOTNET_CLI_HOME=/home/algoarena/.dotnet
ENV DOTNET_NOLOGO=1
ENV HOME=/home/algoarena

EXPOSE 3000

USER algoarena

CMD ["node", "src/index.js"]
