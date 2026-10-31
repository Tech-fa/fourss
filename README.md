# Fourss

Download the app to easily deploy your version. These links download the latest release:

- [Windows](https://buho.tech-fa.ca/download/windows)
- [Mac](https://buho.tech-fa.ca/download/mac)

Documents application: a Vue dashboard (`web_dashboard`) and a Nest API (`web_backend`).

Run each app on its own with [web_dashboard/README.md](web_dashboard/README.md) and [web_backend/README.md](web_backend/README.md).

## Deploy

A push to `main` builds a Docker image and publishes it to Docker Hub. Buho Deploy pulls those images onto a server and starts them with MySQL, Redis, and RabbitMQ.

Images can also be built with **Run workflow** on either workflow, without a push.

The Docker Hub account is `techfa22`. Actions signs in with the `DOCKERHUB_TOKEN` secret.

### Website image

Workflow: `.github/workflows/ui-image.yml`

It runs when `main` changes any of:

- `web_dashboard/**`
- `deploy/ui.Dockerfile`
- `deploy/nginx.conf`
- `deploy/ui-config.json`

`deploy/ui.Dockerfile` builds the dashboard with Node 24 and npm 11 (`npm run build-only`), then nginx serves `dist` on port 80. `deploy/ui-config.json` is copied to `/config.json`. The dashboard reads `apiUrl` from that file and calls the API there.

Published tags:

- `techfa22/fourss-ui:latest`
- `techfa22/fourss-ui:<version>` where `<version>` is `version` in `web_dashboard/package.json`

### API image

Workflow: `.github/workflows/api-image.yml`

It runs when `main` changes `web_backend/**` or `deploy/api.Dockerfile`.

`deploy/api.Dockerfile` builds the API with Node 22. On start the container runs TypeORM migrations, then `node dist/main.js`. The process listens on port 3012.

Published tags:

- `techfa22/fourss-api:latest`
- `techfa22/fourss-api:<version>` where `<version>` is `version` in `web_backend/package.json`

Bump that `version` before a release you want Buho to pick up. Deploy selects the highest numeric tag on Docker Hub.

### What Buho starts

Deploy writes a Compose file that pins those version tags, then pulls and starts:

| Service | Image | Port |
| --- | --- | --- |
| MySQL | `mysql:8.4` | internal |
| Redis | `redis:7` | internal |
| RabbitMQ | `rabbitmq:3` | internal |
| API | `techfa22/fourss-api:<version>` | 3012 |
| Dashboard | `techfa22/fourss-ui:<version>` | 80 |

The API container gets its environment from the shell: database, `REDIS_URI`, `RABBIT_HOST`, mail, admin user, and encryption settings. Uploaded files stay on a Docker volume mounted at the API's storage directory.

Deploy rewrites the dashboard `config.json` so `apiUrl` is the server's API address (`http://<ip>:3012`). The site is then at `http://<ip>`.

A later domain step moves both containers onto localhost, terminates HTTPS in nginx, and points the dashboard at `https://4ss-app-api.<domain>`.
