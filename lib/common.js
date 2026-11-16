export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);
export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Parses the JSON body, drops bots, and verifies the Turnstile token.
// Returns { data } on success or { error: Response } on failure.
export async function parse(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return { error: json({ error: "Invalid request." }, 400) };
  }
  if (data.hp_check) return { error: json({ ok: true }) }; // honeypot: pretend it worked

  const token = data["cf-turnstile-response"];
  if (!token) return { error: json({ error: "Complete the spam check and try again." }, 400) };

  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: request.headers.get("CF-Connecting-IP") || ""
    })
  });
  const result = await check.json();
  if (!result.success) return { error: json({ error: "The spam check failed. Please try again." }, 400) };
  return { data };
}
