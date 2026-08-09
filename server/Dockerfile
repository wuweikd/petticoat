FROM node:20-bookworm AS build
WORKDIR /app
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
# npm may print "Exit handler never called!" under BuildKit and return non-zero
# even when the install completed; verify bins explicitly afterwards.
RUN npm ci --ignore-scripts || npm install --ignore-scripts || true \
  && test -x node_modules/.bin/prisma \
  && test -x node_modules/.bin/nest \
  && ./node_modules/.bin/prisma generate
COPY . .
RUN npm run build \
  && test -f dist/main.js

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p uploads
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
