# syntax=docker/dockerfile:1

# Meridian Shop — local Docker image
# Intentionally vulnerable training application. Do not deploy publicly.

FROM node:22-slim

WORKDIR /app

# ---- Dependency installation (cached layer) ----
COPY package.json package-lock.json ./

RUN npm ci

# ---- Application source ----
COPY . .

# ---- Required runtime directories ----
RUN mkdir -p /app/data /app/uploads

ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "npm run seed && npm start"]