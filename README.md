# Sky No Limit — skynolimit.dev

Redesigned studio website for Sky No Limit (mobile & web development).
Replaces the previous Ionic React app hosted on Firebase; built to run on the
`sky` server alongside the other apps/APIs (top-scores, my-boris-bikes,
train-track-uk, …).

## Stack

- Static site built with **Vite** (no framework — hand-written HTML/CSS/JS)
- **Express** server (`web/server.mjs`) serving `dist/` with legacy-route
  redirects and a `/healthz` endpoint
- Self-hosted fonts (Fraunces + Instrument Sans variable woff2, no external requests)
- All logo/portfolio assets preserved from the old site under `web/public/assets/`

## Develop

```sh
cd web
npm install
npm run dev        # Vite dev server
```

## Run in production

```sh
cd web
npm start          # builds then serves on PORT (default 3030)
```

## Deploy to `sky`

Registered in `server-tooling/deploy/config/node_projects.json` as
`sky-no-limit-web` (port 3030, service `com.sky-no-limit.website`), and routed
in `server-tooling/caddy/setup-caddy-cloudflare-tunnel.zsh` (Caddy host block
for `skynolimit.dev` -> 127.0.0.1:3030, `www` -> apex redirect, plus
cloudflared ingress entries for both hostnames).

To deploy:

```sh
cd ~/dev/server-tooling
./caddy/setup-caddy-cloudflare-tunnel.zsh sky   # one-off: refresh Caddy + tunnel config
./deploy/node_project.zsh sky-no-limit-web sky  # deploy the site
```

DNS cutover: point the `skynolimit.dev` (and `www`) records at the Cloudflare
tunnel (CNAME to `<tunnel-id>.cfargotunnel.com`, or `cloudflared tunnel route
dns <tunnel> skynolimit.dev`), then decommission the Firebase hosting.

## Legacy routes

Old Ionic-app routes 301-redirect into the single-page layout:

| Old                        | New                 |
| -------------------------- | ------------------- |
| `/home`                    | `/`                 |
| `/portfolio`               | `/#work`            |
| `/portfolio/traintrack-uk` | `/#traintrack-uk`   |
| `/portfolio/top-scores`    | `/#top-scores`      |
| `/portfolio/my-boris-bikes`| `/#my-boris-bikes`  |
| `/portfolio/bromley-bins`  | `/#bromley-bins`    |
| `/about`, `/about-us`, `/about_us` | `/#about`   |

App Store-referenced legal URLs are served directly (not redirected) and must
keep working at these exact paths:

- `https://skynolimit.dev/privacy_policy`
- `https://skynolimit.dev/terms_of_use`

## Design

See `.impeccable.md` for the design context ("cinematic orbital studio"
direction, palette, type choices) used for the 2026 redesign.
