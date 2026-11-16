# Black Swan Marketing website

A Cloudflare Worker that serves the static site from `public/` and saves form submissions to a D1 database.

## Repo layout (must look like this at the repo root)
```
wrangler.toml
schema.sql
src/worker.js
public/        (index.html, portfolio.html, about.html, contact.html, assets/)
```

## One-time setup
1. Create the D1 database (Cloudflare dashboard: Storage & Databases > D1 > Create, name it `black-swan-leads`). Copy its database ID into `wrangler.toml`.
2. Create the tables: open the database's Console in the dashboard and run the contents of `schema.sql`. (CLI alternative: `npx wrangler d1 execute black-swan-leads --remote --file=schema.sql`)
3. Create a Turnstile widget in the dashboard. In `public/contact.html`, replace the test site key `1x00000000000000000000AA` (two places) with your real site key.
4. Add the Turnstile secret key as a secret named `TURNSTILE_SECRET` on the Worker (Settings > Variables and Secrets, or `npx wrangler secret put TURNSTILE_SECRET`).
5. Make sure `name` in `wrangler.toml` matches your Worker's name in the dashboard.
6. Push to Git. The build runs `npx wrangler deploy`. No build command is needed.

## Run locally
```
npx wrangler d1 execute black-swan-leads --local --file=schema.sql
npx wrangler dev
```
`.dev.vars` holds Cloudflare's always-pass Turnstile test secret for local use only.

## Where submissions go
- `newsletter_subscribers`: newsletter signups (one row per email).
- `inquiries`: "work with me" messages.

Export everything: `npx wrangler d1 export black-swan-leads --remote --output=leads.sql`
Or read one table: `npx wrangler d1 execute black-swan-leads --remote --command "SELECT * FROM inquiries" --json`

## Placeholders to replace
Anything in [square brackets], the "Project image goes here" frames on `portfolio.html`, and the About page text.

## Connecting a CRM later
Add a step after the `INSERT` in `newsletter()` and `inquiry()` in `src/worker.js` that posts to your CRM's API or webhook. Use `synced_to_crm` to track what has been sent.
