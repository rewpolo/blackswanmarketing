import { json, parse, clean, isEmail } from "../../lib/common.js";

export async function onRequestPost({ request, env }) {
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
