# API

Nest API for documents, authentication, and permissions. The dashboard runs separately and calls this process.

## Run

Use Node 22, matching `deploy/api.Dockerfile`.

MySQL, Redis, and RabbitMQ need to be running before the API starts. The published stack uses MySQL 8.4, Redis 7, and RabbitMQ 3.

```bash
cd web_backend
npm ci
```

Create `.env` in this directory (it is gitignored):

```bash
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=documents
DB_PASSWORD=change-me
DB_NAME=documents
NODE_ENV=development
PORT=3012
FRONTEND_URL=http://127.0.0.1:3003
FILE_STORAGE_DIR=storage
ENCRYPTION_KEY=change-me
SECRET_KEY=change-me
ENVIRONMENT=development
REDIS_URI=redis://127.0.0.1:6379
RABBIT_HOST=amqp://guest:guest@127.0.0.1:5672
RESEND_API_KEY=
FROM_EMAIL=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

`PORT` should stay 3012. That is the port the server listens on, and the port the dashboard expects.

`ADMIN_EMAIL` can list more than one address, separated by commas. When both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, startup creates those admin users. Leave them empty to skip that.

Apply migrations, then start the API:

```bash
npm run migration:run
npm run start:dev
```

The API is at http://127.0.0.1:3012. Swagger is at http://127.0.0.1:3012/docs.

The production image runs the same migration command, then `node dist/main.js`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run start:dev` | API with reload |
| `npm run start:debug` | API with the debugger and reload |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run `dist/main` |
| `npm test` | Unit tests |
| `npm run migration:run` | Apply migrations |
| `npm run migration:revert` | Roll back the last migration |
| `npm run migration:generate` | Generate a migration. Set `NAME` to the migration name. |
