# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile Ndalem Pleret — deploy cepat via BuildKit npm cache.
#
# Sama persis dengan setup yang sudah terbukti jalan (node:20-alpine, port 5000),
# hanya ditambah cache mount npm → `npm ci` jauh lebih cepat (paket di-reuse,
# tidak download ulang) bahkan saat package-lock berubah.
#
# Layering: dependencies dipisah dari kode →
#   ubah kode saja  = layer npm ci di-skip (cache) → cuma `npm run build` (~30-90 dtk)
#   ubah package.json = npm ci jalan lagi, tapi cepat berkat cache mount
#
# Wajib BuildKit (deploy.ps1 sudah set DOCKER_BUILDKIT=1).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Layer dependencies (di-cache selama package*.json tidak berubah)
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Layer kode + build (vite → dist/public, esbuild → dist/index.cjs)
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD ["node", "dist/index.cjs"]
