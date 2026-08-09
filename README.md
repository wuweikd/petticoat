# Petticoat / 小裙子

Lolita 衣橱 + 社区（Expo / NestJS / Admin）

## 本地开发

- `server/`：NestAPI，默认 `http://127.0.0.1:3001/api`
- `mobile/`：Expo App
- `admin/`：管理后台

演示账号：`13800138000` / 验证码 `0000`

## Zeabur 部署（server）

1. 项目内先添加 PostgreSQL 服务
2. 再从 GitHub 部署本仓库，**Root Directory = `server`**
3. 环境变量：
   - `DATABASE_URL`：绑定 Postgres 内网连接串
   - `JWT_SECRET`：自定义长随机串
   - `PORT`：由平台注入即可
4. 首次上线后在服务终端执行（可选）：`npm run prisma:seed`
5. 绑定域名后，手机端把 API 设为 `https://你的域名/api`
