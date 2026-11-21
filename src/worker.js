// Cloudflare Worker: handles the two form endpoints and serves the static site from ./public.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Parses the JSON body, drops bots, and verifies the Turnstile token.
// Returns { data } on success or { error: Response } on failure.
async function parse(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return { error: json({ error: "Invalid request." }, 400) };
  }
  if (data.hp_check) return { error: json({ ok: true }) }; // honeypot: pretend it worked

  const token = data["cf-turnstile-response"];
  if (!token) return { error: json({ error: "Complete the spam check and try again." }, 400) };

  if (!env.TURNSTILE_SECRET) {
    console.error("TURNSTILE_SECRET is not set on this Worker. Add it under Settings > Variables and Secrets as a Secret.");
    return { error: json({ error: "The spam check failed (server is missing its secret key)." }, 500) };
  }

  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: request.headers.get("CF-Connecting-IP") || ""
    })
  });
  const result = await check.json();
  if (!result.success) {
    // Turnstile says why it failed, e.g. "invalid-input-secret" (wrong secret) or "timeout-or-duplicate" (token reused).
    const codes = (result["error-codes"] || []).join(", ") || "unknown";
    console.error("Turnstile check failed:", codes, "hostname:", result.hostname);
    return { error: json({ error: `The spam check failed (${codes}). Please try again.` }, 400) };
  }
  return { data };
}

async function newsletter(request, env) {
  const { data, error } = await parse(request, env);
  if (error) return error;

  const name = clean(data.name, 100);
  const email = clean(data.email, 254).toLowerCase();
  if (!isEmail(email)) return json({ error: "Enter a valid email address." }, 400);

  await env.DB.prepare(
    "INSERT INTO newsletter_subscribers (name, email) VALUES (?1, ?2) ON CONFLICT(email) DO UPDATE SET name = excluded.name"
  ).bind(name, email).run();

  return json({ ok: true });
}

async function inquiry(request, env) {
  const { data, error } = await parse(request, env);
  if (error) return error;

  const name = clean(data.name, 100);
  const email = clean(data.email, 254).toLowerCase();
  const message = clean(data.message, 2000);
  if (!name || !message) return json({ error: "Add your name and a message." }, 400);
  if (!isEmail(email)) return json({ error: "Enter a valid email address." }, 400);

  await env.DB.prepare(
    "INSERT INTO inquiries (name, email, firm, metro, topic, message) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  ).bind(name, email, clean(data.firm, 150), clean(data.metro, 100), clean(data.topic, 100), message).run();

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/newsletter" || pathname === "/api/inquiry") {
      if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
      try {
        return pathname === "/api/newsletter" ? await newsletter(request, env) : await inquiry(request, env);
      } catch (err) {
        console.error(err);
        return json({ error: "Something went wrong. Please try again." }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
