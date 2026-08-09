# Petticoat Server

NestJS + Prisma + PostgreSQL API（与 App / Admin 共用）。

## 本地

```bash
# 需要本机 Postgres，或：
# docker compose up -d postgres

cd server
cp .env.example .env   # 若尚未有 .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

健康检查：`GET http://localhost:3001/api/health`  
Admin 目录：`GET/POST http://localhost:3001/api/admin/catalog/brands`
