FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres"
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
# Ignore lifecycle scripts during install to avoid flaky npm exit-handler bugs
# with Prisma postinstall; generate the client with the locked local CLI.
RUN npm ci --ignore-scripts \
  && ./node_modules/.bin/prisma generate \
  && test -x node_modules/.bin/nest
COPY . .
RUN npm run build \
  && test -f dist/main.js

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres"
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --ignore-scripts \
  && ./node_modules/.bin/prisma generate \
  && mkdir -p uploads
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
