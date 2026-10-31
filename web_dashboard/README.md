# Dashboard

Vue dashboard for Fourss. It talks to the API in `web_backend`.

## Run

Use Node 24 and npm 11. The lockfile is written by npm 11, and older npm rejects it.

```bash
cd web_dashboard
npm ci
```

Create `.env.development` in this directory (it is gitignored):

```bash
VITE_API_URL=http://127.0.0.1:3012
VITE_PORT=3003
```

`VITE_API_URL` is the API the dev server calls. `VITE_PORT` defaults to 3003 when it is omitted.

Start the API first, then:

```bash
npm run dev
```

Open http://127.0.0.1:3003.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Locale check, type-check, and production build |
| `npm run build-only` | Production build only. The website image uses this. |
| `npm run preview` | Serve the production build |
| `npm run test:unit` | Unit tests |

A production build reads `/config.json` at startup. When that file has `apiUrl`, it replaces `VITE_API_URL`. The published image ships `deploy/ui-config.json` as that file, and Buho Deploy overwrites it with the server's API address.
